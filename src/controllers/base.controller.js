import express from 'express';

export class BaseController {
  constructor() {
    this.router = express.Router();
  }

  routes() {
    throw new Error('Method not implemented.');
  }
}
