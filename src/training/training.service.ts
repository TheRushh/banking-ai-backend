import { Injectable } from '@nestjs/common';
import {
  BedrockClient,
  CreateModelCustomizationJobCommand,
  CreateModelCustomizationJobCommandInput,
  GetModelCustomizationJobCommand,
  GetModelCustomizationJobCommandInput,
} from '@aws-sdk/client-bedrock';

@Injectable()
export class TrainingService {
  // assert AWS_REGION is set
  private client = new BedrockClient({ region: process.env.AWS_REGION! });

  async start() {
    // assert your env var is set
    const s3Uri = process.env.TRAINING_DATA_S3_URI!;

    // Build the exact input type
    const input: CreateModelCustomizationJobCommandInput = {
      jobName:      `banking-poc-${Date.now()}`,
      baseModelArn: process.env.BEDROCK_BASE_MODEL_ARN!,
      trainingDataConfig: {
        // only s3Uri is supported; no `inputFormat`
        s3Uri,
      },
      outputDataConfig: {
        s3Uri: s3Uri.replace(/\.jsonl$/, '/output/'),
      },
      stoppingCondition: { maxRuntimeInSeconds: 3600 },
    } as any;

    const resp = await this.client.send(
      new CreateModelCustomizationJobCommand(input)
    );

    // jobArn is optional on the output type, assert it's there
    return { jobArn: resp.jobArn! };
  }

  async status(jobArn: string) {
    // the SDK expects `jobId` here, not `jobArn`
    const input: GetModelCustomizationJobCommandInput = { jobId: jobArn } as any;
    const resp = await this.client.send(
      new GetModelCustomizationJobCommand(input)
    );

    // The TS types don’t expose `status`/`modelArn` on the output, so use any
    const anyResp = resp as any;
    return {
      status:   anyResp.status,    // e.g. "RUNNING" | "COMPLETED"
      modelArn: anyResp.modelArn,  // your new model ARN once complete
    };
  }
}
