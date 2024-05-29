import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as elbv2targets from "aws-cdk-lib/aws-elasticloadbalancingv2-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as elb2Actions from "aws-cdk-lib/aws-elasticloadbalancingv2-actions";

export class TsAwsCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Make an Cognito User Pool
    const userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: "UserPoolCDK",
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
    });

    // Make an Cognito User Pool Client
    const userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool: userPool,
      userPoolClientName: "UserPoolClientCDK",
      generateSecret: true,
    });

    // Make an Cognito User Pool Domain
    const userPoolDomain = new cognito.UserPoolDomain(this, "UserPoolDomain", {
      cognitoDomain: {
        domainPrefix: "userpoolcdk",
      },
      userPool,
    });

    const vpc: ec2.IVpc = new ec2.Vpc(this, "VPC", {
      // natGateways: 1, // It creates a NAT Gateway, and it has associated costs because launches an EC2 instance
      maxAzs: 2, // It creates a VPC with two subnets in different AZs
    });

    const lambdaFunction = new lambda.Function(this, "LambdaDemoBalancer", {
      code: new lambda.AssetCode("./lambda"),
      handler: "index.handler",
      runtime: lambda.Runtime.NODEJS_LATEST,
      vpc,
    });

    lambdaFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: ["*"],
      })
    );

    // Role for ALB to invoke Lambda
    const albRole = new iam.Role(this, "AlbRole", {
      assumedBy: new iam.ServicePrincipal("elasticloadbalancing.amazonaws.com"),
    });
    lambdaFunction.grantInvoke(albRole);

    const alb = new elbv2.ApplicationLoadBalancer(this, "ALB", {
      vpc,
      internetFacing: true,
    });

    // Create a target group for the ALB
    const targetGroup = new elbv2.ApplicationTargetGroup(this, "TargetGroup", {
      vpc,
      targets: [new elbv2targets.LambdaTarget(lambdaFunction)],
    });

    // Add a listener to the ALB
    const listener = alb.addListener("Listener", {
      port: 80,
      open: true,
    });

    listener.addTargetGroups("TargetGroup", {
      targetGroups: [targetGroup],
      priority: 1,
      conditions: [elbv2.ListenerCondition.pathPatterns(["/routes"])],
    });

    listener.addAction("ForwardAuth", {
      action: new elb2Actions.AuthenticateCognitoAction({
        userPoolClient,
        userPool,
        userPoolDomain,
        next: elbv2.ListenerAction.forward([targetGroup]),
      }),
    });

    listener.addAction("DefaultAction", {
      action: elbv2.ListenerAction.fixedResponse(404, {
        contentType: "text/plain",
        messageBody: "Not Found",
      }),
    });

    new cdk.CfnOutput(this, "LoadBalancerDNS", {
      value: alb.loadBalancerDnsName,
    });
  }
}
