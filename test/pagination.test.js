const { describe, it, before, afterEach, } = require('mocha')
const assert = require('assert');
const { createSandbox } = require('sinon');
const Pagination = require('../src/pagination');



describe('Pagination tets', function () {
  
  let sandbox
  before(() => {
    sandbox = createSandbox()
  })
  afterEach(() => sandbox.restore())

  describe('#Pagination', () => {
      it('should retry an request twice bafore throing an exception', async () => {
        const expectedCallCount = 2;
        const expectedTimeout = 10;

        
        const pagination = new Pagination();
        pagination.maxRetries = expectedCallCount;
        pagination.retryTimeout = expectedTimeout;
        pagination.maxRequestTimeout = expectedTimeout;

        const error = new Error('timeout');
        sandbox.spy(pagination, pagination.handleRequest.name);

        const dataRequest = { url: 'https://google.com' };
        await assert.rejects(pagination.handleRequest(dataRequest), error);
        assert.deepStrictEqual(pagination.handleRequest.callCount, expectedCallCount);

      });

      it('should validate request params');
      it('should validate the flow');

      it('shoul return data from request when succeded');

  })
})