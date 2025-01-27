import path from 'path';

const dirname = path.dirname('.');

export const config = {
  resourcesDir: path.resolve(dirname, './resources'),
  downloadsDir: path.resolve(dirname, './downloads'),
};
