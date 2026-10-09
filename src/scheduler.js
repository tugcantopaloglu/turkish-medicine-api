import cron from 'node-cron';
import MedicineDownloader from './downloader.js';
import { isMainModule } from './config.js';

class DownloadScheduler {
  constructor() {
    this.cronSchedule = process.env.SCHEDULE_CRON || '0 9 * * 1';
    if (!cron.validate(this.cronSchedule)) {
      throw new Error('SCHEDULE_CRON must be a valid cron expression');
    }
    this.downloader = new MedicineDownloader();
    this.task = null;
  }

  start() {
    console.log('Starting download scheduler...');
    console.log(`Schedule: ${this.cronSchedule}`);
    console.log(this.getNextRunTime());

    this.task = cron.schedule(this.cronSchedule, async () => {
      console.log('Scheduled download started...');
      console.log(`Time: ${new Date().toISOString()}`);

      try {
        await this.downloader.download();
        console.log('Scheduled download completed successfully!');
      } catch (error) {
        console.error('Scheduled download failed:', error.message);
      }
    });

    console.log('Scheduler is running. Press Ctrl+C to stop.');

    process.on('SIGINT', () => {
      console.log('\nStopping scheduler...');
      this.stop();
      process.exit(0);
    });
  }

  stop() {
    if (this.task) {
      this.task.stop();
      console.log('Scheduler stopped.');
    }
  }

  getNextRunTime() {
    return `Schedule: ${this.cronSchedule} (system local timezone)`;
  }

  async runNow() {
    console.log('Running download immediately...');
    try {
      await this.downloader.download();
      console.log('Immediate download completed successfully!');
    } catch (error) {
      console.error('Immediate download failed:', error.message);
      throw error;
    }
  }
}

if (isMainModule(import.meta.url)) {
  const scheduler = new DownloadScheduler();
  const args = process.argv.slice(2);

  if (args.includes('--now')) {
    scheduler.runNow().then(() => process.exit(0)).catch(() => process.exit(1));
  } else {
    scheduler.start();
  }
}

export default DownloadScheduler;
