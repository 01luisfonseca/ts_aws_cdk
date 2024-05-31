#!/usr/bin/env node
import "dotenv/config";
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { TsAwsCdkStack } from "../lib/ts_aws_cdk-stack";

const app = new cdk.App();
new TsAwsCdkStack(app, "TsAwsCdkStack", {
  env: {
    account: process.env.PROYECT_ACCOUNT,
    region: process.env.PROYECT_REGION,
  },
});
