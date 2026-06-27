import { CodedActionAppService } from '@uipath/coded-action-app';

// No platform SDK services are needed — the form only reads task inputs and
// completes with an outcome. Add @uipath/uipath-typescript services here later
// if the form ever needs Orchestrator / Data Fabric / Maestro calls.
export const codedActionAppService = new CodedActionAppService();
