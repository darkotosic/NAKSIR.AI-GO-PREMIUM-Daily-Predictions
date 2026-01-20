export const formatKickoffBelgrade = (iso: string): { date: string; time: string } => {
  try {
    const dateValue = new Date(iso);
    if (Number.isNaN(dateValue.getTime())) {
      return { date: '--', time: '--' };
    }
    const dateFormatter = new Intl.DateTimeFormat('sr-RS', {
      timeZone: 'Europe/Belgrade',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timeFormatter = new Intl.DateTimeFormat('sr-RS', {
      timeZone: 'Europe/Belgrade',
      hour: '2-digit',
      minute: '2-digit',
    });
    return {
      date: dateFormatter.format(dateValue),
      time: timeFormatter.format(dateValue),
    };
  } catch {
    return { date: '--', time: '--' };
  }
};
