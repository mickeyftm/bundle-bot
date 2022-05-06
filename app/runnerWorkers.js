const Queue = require('bull');
const cluster = require('cluster');
const RunnerWorker = require("../lib/RunnerWorker");

const numWorkers = process.env.NUM_WORKERS;
const taskQueue = new Queue("Task queue", process.env.REDIS_ENDPOINT, {
  redis: {
    db: Number.parseInt(process.env.DB_NUMBER_FOR_JOBS)
  }
});

if (cluster.isMaster) {
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  cluster.on("error", err => {
    throw err;
  })
  cluster.on("message", message => {
    process.send(message);
  })
  cluster.on('exit', function (worker, code, signal) {
    process.send('worker ' + worker.process.pid + ' died');
  });
} else {
  taskQueue.process(async function (job, jobDone) {
    const runnerWorker = new RunnerWorker();
    runnerWorker.process(job.data);
    runnerWorker.on("error", err => {
      throw err;
    })
    runnerWorker.on("info", message => {
      process.send(message);
    });
    jobDone();
  });
}