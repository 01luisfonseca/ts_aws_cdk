#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { TsAwsCdkStack } from "../lib/ts_aws_cdk-stack";

const app = new cdk.App();
new TsAwsCdkStack(app, "TsAwsCdkStack", {
  env: { region: "us-east-1" },
});
