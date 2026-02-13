export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    process.on('uncaughtException', (err) => {
      console.error('[uncaughtException] Process kept alive:', err.message);
    });

    process.on('unhandledRejection', (reason) => {
      console.error(
        '[unhandledRejection] Process kept alive:',
        reason instanceof Error ? reason.message : reason,
      );
    });
  }
}
