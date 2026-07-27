import { flags } from './_selene.js';

export default function handler(_req, res) {
  res.json(flags);
}
