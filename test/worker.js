const Queue = require("bull");
const { ENDPOINTS, FORKS, FORK_5, TEST_PARAMS } = require("./TestConstants");
const { ABIS, PARAMS } = require("../lib/Constants");
const FindShortfallPositions = require("../lib/FindShortfallPositions");
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");
const AccountsDbClient = require("../lib/AccountsDbClient");

const taskQ = new Queue("task q", "http://127.0.0.1:6379", {
  redis: {
    db: 1
  }
});

taskQ.process(async function (job, done) {
  const provider = new ethers.providers.JsonRpcProvider(ENDPOINTS.RPC_PROVIDER);
  const db = {
    host: ENDPOINTS.REDIS_HOST,
    port: ENDPOINTS.REDIS_PORT,
  };
  const store = new AccountsDbClient(db);
  await store.init();
  
  console.log(new Date(), process.pid);
  const accounts = await store.getStoredCompoundAccounts(job.data.chunkIndex,
    job.data.splitFactor);
  console.log(new Date(), process.pid);
  
  console.log(`# of sick accounts: ${accounts.length}`, process.pid);
  const params = await store.getStoredCompoundParams();
  const lowTestingGasPrice = BigNumber.from("3000000000");
  const finder = new FindShortfallPositions(
    accounts,
    params,
    lowTestingGasPrice,
    provider
  );
  finder.chainId = 1337;
  finder.minProfit = PARAMS.MIN_LIQ_PROFIT;
  console.log(new Date(), process.pid);
  const arr = await finder.getLiquidationTxsInfo();
  console.log(new Date(), process.pid);
  console.log('done', process.pid);
  // job.data contains the custom data passed when the job was created
  // job.id contains id of this job.
  // job.progress(42);
  done();
  // done(new Error("error transcoding"));
  // done(null, { framerate: 29.5 /* etc... */ });
  // throw new Error("some unexpected error");
});