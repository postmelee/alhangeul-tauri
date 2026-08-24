export async function runActionWithPostcondition(run, actionRequest, postconditionRequest) {
  let result;
  let actionError;
  try {
    result = await run(actionRequest);
  } catch (error) {
    if (!isBoundedActionTimeout(error, actionRequest.command)) throw error;
    actionError = error;
  }

  try {
    await run(postconditionRequest);
  } catch (postconditionError) {
    if (actionError === undefined) throw postconditionError;
    throw new Error(`${actionError.message}; postcondition failed: ${errorText(postconditionError)}`);
  }
  return actionError === undefined ? result : { confirmedAfterTimeout: true };
}

function isBoundedActionTimeout(error, command) {
  if (!['action', 'actionIfPresent'].includes(command) || !(error instanceof Error)) return false;
  return error.message.startsWith(`AT-SPI ${command} failed:`)
    && error.message.includes('ETIMEDOUT');
}

function errorText(error) {
  return error instanceof Error ? error.message : String(error);
}
