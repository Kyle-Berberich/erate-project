import { prisma } from '../index.js';
import { sendDeadlineReminderEmail, sendOverdueNotificationEmail, sendDailyDigestEmail } from './email.js';

/**
 * Check for upcoming deadlines and send reminders
 * Run this daily
 */
export async function checkDeadlinesAndNotify(): Promise<void> {
  console.log('Running deadline check...');

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Get compliance documents with upcoming deadlines
  const upcomingDocs = await prisma.complianceDoc.findMany({
    where: {
      dateRequired: {
        gte: now,
        lte: thirtyDaysFromNow,
      },
      status: {
        not: 'APPROVED',
      },
    },
    include: {
      application: {
        include: {
          vendor: true,
        },
      },
    },
  });

  // Get overdue documents
  const overdueDocs = await prisma.complianceDoc.findMany({
    where: {
      dateRequired: {
        lt: now,
      },
      status: {
        not: 'APPROVED',
      },
    },
    include: {
      application: {
        include: {
          vendor: true,
        },
      },
    },
  });

  // Get all admin and manager users to notify
  const usersToNotify = await prisma.user.findMany({
    where: {
      role: {
        in: ['ADMIN', 'MANAGER'],
      },
    },
  });

  // Send deadline reminders for upcoming documents
  for (const doc of upcomingDocs) {
    const daysUntil = Math.ceil((new Date(doc.dateRequired!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Send reminders at 30, 14, 7, 3, and 1 days before deadline
    if ([30, 14, 7, 3, 1].includes(daysUntil)) {
      for (const user of usersToNotify) {
        try {
          await sendDeadlineReminderEmail(
            user.email,
            doc.documentType,
            doc.application.name,
            doc.application.frn,
            new Date(doc.dateRequired!)
          );

          // Create notification record
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: 'DEADLINE_REMINDER',
              title: `Upcoming Deadline: ${doc.documentType}`,
              message: `${doc.documentType} for ${doc.application.frn} is due in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}`,
              relatedType: 'ComplianceDoc',
              relatedId: doc.id,
            },
          });
        } catch (error) {
          console.error(`Failed to send deadline reminder to ${user.email}:`, error);
        }
      }
    }
  }

  // Send overdue notifications
  for (const doc of overdueDocs) {
    for (const user of usersToNotify) {
      try {
        await sendOverdueNotificationEmail(
          user.email,
          doc.documentType,
          doc.application.name,
          doc.application.frn,
          new Date(doc.dateRequired!)
        );

        // Create notification record
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: 'OVERDUE',
            title: `OVERDUE: ${doc.documentType}`,
            message: `${doc.documentType} for ${doc.application.frn} is overdue`,
            relatedType: 'ComplianceDoc',
            relatedId: doc.id,
          },
        });
      } catch (error) {
        console.error(`Failed to send overdue notification to ${user.email}:`, error);
      }
    }
  }

  console.log(`Deadline check complete. Sent notifications for ${upcomingDocs.length} upcoming and ${overdueDocs.length} overdue items.`);
}

/**
 * Send daily digest emails to all users
 * Run this daily at a scheduled time (e.g., 8 AM)
 */
export async function sendDailyDigests(): Promise<void> {
  console.log('Sending daily digests...');

  const users = await prisma.user.findMany({
    where: {
      role: {
        in: ['ADMIN', 'MANAGER', 'CONTRIBUTOR'],
      },
    },
  });

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Get summary data
  const upcomingDeadlines = await prisma.complianceDoc.count({
    where: {
      dateRequired: {
        gte: now,
        lte: thirtyDaysFromNow,
      },
      status: {
        not: 'APPROVED',
      },
    },
  });

  const overdueItems = await prisma.complianceDoc.count({
    where: {
      dateRequired: {
        lt: now,
      },
      status: {
        not: 'APPROVED',
      },
    },
  });

  const pendingApplications = await prisma.application.count({
    where: {
      status: {
        in: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW'],
      },
    },
  });

  // Get recent audit logs for updates
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const recentAudits = await prisma.auditLog.findMany({
    where: {
      createdAt: {
        gte: yesterday,
      },
      action: {
        in: ['CREATE', 'UPDATE'],
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
  });

  const recentUpdates = recentAudits.map((audit) => ({
    type: audit.action,
    message: `${audit.entity} ${audit.entityId} was ${audit.action.toLowerCase()}d`,
  }));

  // Send digest to each user
  for (const user of users) {
    try {
      await sendDailyDigestEmail(user.email, {
        upcomingDeadlines,
        overdueItems,
        pendingApplications,
        recentUpdates,
      });
    } catch (error) {
      console.error(`Failed to send daily digest to ${user.email}:`, error);
    }
  }

  console.log(`Daily digests sent to ${users.length} users.`);
}

/**
 * Initialize scheduled tasks
 * This should be called when the server starts
 */
export function initializeScheduler(): void {
  console.log('Initializing scheduler...');

  // Run deadline check daily at midnight
  const midnightInterval = 24 * 60 * 60 * 1000; // 24 hours
  setInterval(() => {
    checkDeadlinesAndNotify();
  }, midnightInterval);

  // Run initial check on startup (with 1 minute delay)
  setTimeout(() => {
    checkDeadlinesAndNotify();
  }, 60000);

  // Run daily digest at 8 AM (adjust as needed)
  const now = new Date();
  const next8AM = new Date(now);
  next8AM.setHours(8, 0, 0, 0);
  if (next8AM <= now) {
    next8AM.setDate(next8AM.getDate() + 1);
  }

  const timeUntil8AM = next8AM.getTime() - now.getTime();
  setTimeout(() => {
    sendDailyDigests();
    // Then run every 24 hours
    setInterval(() => {
      sendDailyDigests();
    }, midnightInterval);
  }, timeUntil8AM);

  console.log('Scheduler initialized. Next deadline check in 1 minute, next daily digest at 8 AM.');
}
