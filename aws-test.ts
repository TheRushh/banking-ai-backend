import 'dotenv/config';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

async function run() {
  const client = new STSClient({});
  const resp = await client.send(new GetCallerIdentityCommand({}));
  console.log('AWS caller identity:', resp);
}
run().catch(console.error);
