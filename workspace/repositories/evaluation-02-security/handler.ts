export function handleRequest(
  req: { body: { command: string } },
) {
  return require("./command").runCommand(
    req.body.command,
  );
}
