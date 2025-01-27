export const logError = (title: string, body: string | Array<string>) => {
  let message = `${title}`;
  if (Array.isArray(body)) {
    for (const item of body) {
      message += (`\n  - ${item}`);
    }
  } else {
    message += body;
  }
  console.error(message);
};
