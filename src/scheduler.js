import cron from 'node-cron';
import dotenv from 'dotenv';
import MedicineDownloader from './downloader.js';

dotenv.config();

class DownloadScheduler {
  constructor() {
    this.cronSchedule = process.env.SCHEDULE_CRON || '0 9 * * 1';
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
    const schedule = this.cronSchedule.split(' ');

    const descriptions = {
      minute: schedule[0],
      hour: schedule[1],
      dayOfMonth: schedule[2],
      month: schedule[3],
      dayOfWeek: schedule[4]
    };

    let description = 'Next run: ';

    if (descriptions.dayOfWeek !== '*') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      description += `Every ${days[parseInt(descriptions.dayOfWeek)]} `;
    } else if (descriptions.dayOfMonth !== '*') {
      description += `Every ${descriptions.dayOfMonth} day of month `;
    } else {
      description += 'Every day ';
    }

    if (descriptions.hour !== '*') {
      description += `at ${descriptions.hour.padStart(2, '0')}:${descriptions.minute.padStart(2, '0')}`;
    }

    return description;
  }

  async runNow() {
    console.log('Running download immediately...');
    try {
      await this.downloader.download();
      console.log('Immediate download completed successfully!');
    } catch (error) {
      console.error('Immediate download failed:', error.message);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const scheduler = new DownloadScheduler();
  const args = process.argv.slice(2);

  if (args.includes('--now')) {
    scheduler.runNow().then(() => process.exit(0)).catch(() => process.exit(1));
  } else {
    scheduler.start();
  }
}

export default DownloadScheduler;
