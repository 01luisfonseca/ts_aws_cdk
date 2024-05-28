import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as elbv2targets from "aws-cdk-lib/aws-elasticloadbalancingv2-targets";
import * as iam from "aws-cdk-lib/aws-iam";

export class TsAwsCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc: ec2.IVpc = new ec2.Vpc(this, "VPC", {
      natGateways: 1,
      maxAzs: 2,
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

    const listener = alb.addListener("Listener", {
      port: 80,
      open: true,
    });

    listener.addTargets("TargetGroup", {
      targets: [new elbv2targets.LambdaTarget(lambdaFunction)],
    });

    new cdk.CfnOutput(this, "LoadBalancerDNS", {
      value: alb.loadBalancerDnsName,
    });
  }
}
