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
		it('#sleep should be a Promisse object and not return values', async () => {
			const clock = sandbox.useFakeTimers();
			const time = 1;
			const pendingPromisse = Pagination.sleep(time);
			clock.tick(time);

			assert.ok(pendingPromisse instanceof Promise);
			const result = await pendingPromisse
			assert.ok(result === undefined);
		});
		describe('#handlRequest', () => {
			it('should retry an request twice before throing an exception and validate request params and flow', async () => {
				const expectedCallCount = 2;
				const expectedTimeout = 10;

				const pagination = new Pagination();
				pagination.maxRetries = expectedCallCount;
				pagination.retryTimeout = expectedTimeout;
				pagination.maxRequestTimeout = expectedTimeout;

				const error = new Error('timeout');
				sandbox.spy(pagination, pagination.handleRequest.name);
				sandbox.stub(Pagination, Pagination.sleep.name)
					.resolves();

				sandbox.stub(pagination.request, pagination.request.makeRequest.name)
					.rejects(error);

				const dataRequest = { url: 'https://google.com', page: 0 };
				await assert.rejects(pagination.handleRequest(dataRequest), error);
				assert.deepStrictEqual(pagination.handleRequest.callCount, expectedCallCount);

				const lastCall = 1;
				const firstCallArg = pagination.handleRequest.getCall(lastCall).firstArg;
				const firstCallRetries = firstCallArg.retries;
				assert.deepStrictEqual(firstCallRetries, expectedCallCount);

				const expectedArgs = {
					url: `${dataRequest.url}?tid=${dataRequest.page}`,
					method: 'get',
					timeout: expectedTimeout,
				};

				const firstCallArgs = pagination.request.makeRequest.getCall(0).args;
				assert.deepStrictEqual(firstCallArgs, [expectedArgs]);

				assert.ok(Pagination.sleep.calledWithExactly(expectedTimeout));
			});

			it('shoul return data from request when succeded', async () => {
				const data = { result: 'ok' };
				const pagination = new Pagination();
				sandbox.stub(pagination.request, pagination.request.makeRequest.name)
				.resolves(data);

			const result = await pagination.handleRequest({ url: 'https://google.com', page: 1 });
			assert.deepStrictEqual(result, data);
			});
		});

		describe('#getPaginated', () => {
			const responseMock = [
				{
					"tid": 8591155,
					"date": 1613249550,
					"type": "buy",
					"price": 256649.99999,
					"amount": 0.00043763
				},
				{
					"tid": 8591157,
					"date": 1613249553,
					"type": "sell",
					"price": 256300.00021,
					"amount": 0.00131003
				}
			];

			it('should update request id on each request', async () => {
				const pagination = new Pagination();
				sandbox.stub(Pagination, Pagination.sleep.name)
					.resolves();

				sandbox.stub(pagination, pagination.handleRequest.name)
					.onCall(0).resolves([responseMock[0]])
					.onCall(1).resolves([responseMock[1]])
					.onCall(2).resolves([]);

				sandbox.spy(pagination, pagination.getPaginated.name);
				const data = { url: 'google.com', page: 1 };

				const secondCallExpectation = {
					...data,
					page: responseMock[0].tid
				};

				const thirdCallExpectation = {
					...secondCallExpectation,
					page: responseMock[1].tid
				};

				/**
				 * Para chamar uma função que é um generator
				 * 	Array.from(pagination.getPaginated()) => dessa forma ele não espera os dados sob demanda,
				 * vai guardar tudo em memória e só depois jogar no array;
				 *
				 * const r = pagination.getPaginated();
				 * r.next() => { done: true | false, value: {} }
				 *
				 * A melhor forma é usar o for of
				*/

				const gen = pagination.getPaginated(data);
				for await (const result of gen) {

				}

				const getFirstArgFromCall = value => pagination.handleRequest.getCall(value).firstArg;
				assert.deepStrictEqual(getFirstArgFromCall(0), data);
				assert.deepStrictEqual(getFirstArgFromCall(1), secondCallExpectation);
				assert.deepStrictEqual(getFirstArgFromCall(2), thirdCallExpectation);

			});

			it('should stop requesting when request return an empty array', async () => {
				const expectedThreshold = 20;
				const pagination = new Pagination();
				pagination.threshold = expectedThreshold;
				sandbox.stub(Pagination, Pagination.sleep.name)
					.resolves();

				sandbox.stub(pagination, pagination.handleRequest.name)
					.onCall(0).resolves([responseMock[0]])
					.onCall(1).resolves([]);

				sandbox.spy(pagination, pagination.getPaginated.name);

				const data = { url: 'google.com', page: 1 };
				const iterator = await pagination.getPaginated(data);
				const [firstResult, secondResult] = await Promise.all([
					iterator.next(),
					iterator.next()
				]);

				const expectedFirstCall = { done: false, value: [responseMock[0]] };
				assert.deepStrictEqual(firstResult, expectedFirstCall);

				const expectedSecondCall = { done: true, value: undefined };
				assert.deepStrictEqual(secondResult, expectedSecondCall);

				assert.deepStrictEqual(Pagination.sleep.callCount, 1)
				assert.ok(Pagination.sleep.calledWithExactly(expectedThreshold))
			});
		});
  	});
})