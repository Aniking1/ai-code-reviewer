export function runCommand(
  userInput: string,
) {
  return require("child_process").exec(
    userInput,
  );
}
