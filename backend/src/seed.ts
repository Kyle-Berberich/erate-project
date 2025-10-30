import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.file.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.projectMilestone.deleteMany();
  await prisma.project.deleteMany();
  await prisma.complianceDoc.deleteMany();
  await prisma.application.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.report.deleteMany();
  await prisma.setting.deleteMany();

  // Create users
  console.log('👥 Creating users...');
  const adminPassword = await bcrypt.hash('admin123', 10);
  const managerPassword = await bcrypt.hash('manager123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@erate.local',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: 'manager@erate.local',
      passwordHash: managerPassword,
      role: 'MANAGER',
    },
  });

  const contributor = await prisma.user.create({
    data: {
      email: 'contributor@erate.local',
      passwordHash: await bcrypt.hash('contributor123', 10),
      role: 'CONTRIBUTOR',
    },
  });

  const viewer = await prisma.user.create({
    data: {
      email: 'viewer@erate.local',
      passwordHash: await bcrypt.hash('viewer123', 10),
      role: 'VIEWER',
    },
  });

  // Create vendors
  console.log('🏢 Creating vendors...');
  const vendors = await Promise.all([
    prisma.vendor.create({
      data: {
        name: 'AT&T Business',
        rating: 4,
        contractValue: 250000,
        contact: 'john.doe@att.com',
        notes: 'Primary telecommunications provider. Excellent service record.',
      },
    }),
    prisma.vendor.create({
      data: {
        name: 'Verizon Enterprise',
        rating: 5,
        contractValue: 180000,
        contact: 'sarah.johnson@verizon.com',
        notes: 'Fiber internet provider. Very responsive to issues.',
      },
    }),
    prisma.vendor.create({
      data: {
        name: 'Spectrum Business',
        rating: 3,
        contractValue: 95000,
        contact: 'mike.wilson@spectrum.com',
        notes: 'Cable internet backup. Occasional service interruptions.',
      },
    }),
    prisma.vendor.create({
      data: {
        name: 'CDW Government',
        rating: 5,
        contractValue: 320000,
        contact: 'lisa.martinez@cdwg.com',
        notes: 'Hardware and software procurement. Excellent pricing.',
      },
    }),
    prisma.vendor.create({
      data: {
        name: 'Dell Education',
        rating: 4,
        contractValue: 145000,
        contact: 'robert.chen@dell.com',
        notes: 'Computer equipment supplier. Good warranty support.',
      },
    }),
  ]);

  // Create applications
  console.log('📄 Creating applications...');
  const currentYear = new Date().getFullYear();
  const applications = await Promise.all([
    prisma.application.create({
      data: {
        frn: currentYear + '001234',
        name: 'Fiber Internet Connectivity - Main Campus',
        vendorId: vendors[1].id,
        category: 'CATEGORY_ONE',
        serviceType: 'Internet Access',
        status: 'COMMITTED',
        amountRequested: 125000,
        amountCommitted: 112500,
        amountDisbursed: 56250,
        discountRate: 80,
        serviceStart: new Date(currentYear + '-07-01'),
        serviceEnd: new Date((currentYear + 1) + '-06-30'),
        applicationDate: new Date(currentYear + '-02-15'),
        approvalDate: new Date(currentYear + '-04-20'),
        notes: 'Primary fiber connection for main campus. 1Gbps symmetrical.',
      },
    }),
    prisma.application.create({
      data: {
        frn: currentYear + '001235',
        name: 'Wireless Network Equipment',
        vendorId: vendors[3].id,
        category: 'CATEGORY_TWO',
        serviceType: 'Internal Connections',
        status: 'APPROVED',
        amountRequested: 85000,
        amountCommitted: 85000,
        amountDisbursed: 0,
        discountRate: 80,
        serviceStart: new Date(currentYear + '-08-01'),
        serviceEnd: new Date(currentYear + '-09-30'),
        applicationDate: new Date(currentYear + '-01-10'),
        approvalDate: new Date(currentYear + '-03-25'),
        notes: 'Replacement of aging wireless access points. 45 units.',
      },
    }),
    prisma.application.create({
      data: {
        frn: currentYear + '001236',
        name: 'Backup Internet Circuit',
        vendorId: vendors[2].id,
        category: 'CATEGORY_ONE',
        serviceType: 'Internet Access',
        status: 'IN_PROGRESS',
        amountRequested: 48000,
        amountCommitted: 43200,
        amountDisbursed: 21600,
        discountRate: 80,
        serviceStart: new Date(currentYear + '-07-01'),
        serviceEnd: new Date((currentYear + 1) + '-06-30'),
        applicationDate: new Date(currentYear + '-02-20'),
        approvalDate: new Date(currentYear + '-05-10'),
        notes: 'Redundant internet connection. 500Mbps cable.',
      },
    }),
    prisma.application.create({
      data: {
        frn: currentYear + '001237',
        name: 'Chromebook Fleet Refresh',
        vendorId: vendors[4].id,
        category: 'CATEGORY_TWO',
        serviceType: 'End User Devices',
        status: 'SUBMITTED',
        amountRequested: 120000,
        amountCommitted: 0,
        amountDisbursed: 0,
        discountRate: 75,
        applicationDate: new Date(currentYear + '-03-01'),
        notes: '250 Chromebooks for student use. Pending approval.',
      },
    }),
    prisma.application.create({
      data: {
        frn: currentYear + '001238',
        name: 'Network Switch Upgrade',
        vendorId: vendors[3].id,
        category: 'CATEGORY_TWO',
        serviceType: 'Internal Connections',
        status: 'DRAFT',
        amountRequested: 65000,
        amountCommitted: 0,
        amountDisbursed: 0,
        discountRate: 80,
        notes: 'Core network switch replacement. Draft in progress.',
      },
    }),
  ]);

  // Create compliance documents
  console.log('📋 Creating compliance documents...');
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const fifteenDaysFromNow = new Date();
  fifteenDaysFromNow.setDate(fifteenDaysFromNow.getDate() + 15);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  await Promise.all([
    prisma.complianceDoc.create({
      data: {
        applicationId: applications[0].id,
        docType: 'FORM_470',
        dateRequired: new Date(currentYear + '-01-15'),
        dateReceived: new Date(currentYear + '-01-10'),
        status: 'APPROVED',
        retentionYears: 5,
        disposalDate: new Date((currentYear + 5) + '-01-10'),
        storageUri: '/FY' + currentYear + '/FRN_' + applications[0].frn + '/FORM_470/form470.pdf',
        reviewer: admin.email,
        notes: 'Completed and filed.',
      },
    }),
    prisma.complianceDoc.create({
      data: {
        applicationId: applications[0].id,
        docType: 'FORM_471',
        dateRequired: new Date(currentYear + '-03-20'),
        dateReceived: new Date(currentYear + '-03-18'),
        status: 'APPROVED',
        retentionYears: 10,
        disposalDate: new Date((currentYear + 10) + '-03-18'),
        storageUri: '/FY' + currentYear + '/FRN_' + applications[0].frn + '/FORM_471/form471.pdf',
        reviewer: manager.email,
        notes: 'Application submitted on time.',
      },
    }),
    prisma.complianceDoc.create({
      data: {
        applicationId: applications[1].id,
        docType: 'CONTRACT',
        dateRequired: fifteenDaysFromNow,
        dateReceived: null,
        status: 'PENDING',
        retentionYears: 5,
        reviewer: manager.email,
        notes: 'Waiting for signed contract from vendor.',
      },
    }),
    prisma.complianceDoc.create({
      data: {
        applicationId: applications[2].id,
        docType: 'INVOICE',
        dateRequired: yesterday,
        dateReceived: null,
        status: 'OVERDUE',
        retentionYears: 7,
        reviewer: contributor.email,
        notes: 'URGENT: Invoice overdue. Follow up with vendor.',
      },
    }),
    prisma.complianceDoc.create({
      data: {
        applicationId: applications[0].id,
        docType: 'BEAR_FORM',
        dateRequired: thirtyDaysFromNow,
        dateReceived: null,
        status: 'PENDING',
        retentionYears: 10,
        reviewer: admin.email,
        notes: 'Quarterly BEAR form due.',
      },
    }),
  ]);

  // Create projects
  console.log('📁 Creating projects...');
  const project1 = await prisma.project.create({
    data: {
      name: 'Campus Wi-Fi Upgrade Project',
      type: 'Infrastructure',
      ownerId: manager.id,
      startDate: new Date(currentYear + '-06-01'),
      endDate: new Date(currentYear + '-08-31'),
      status: 'IN_PROGRESS',
      notes: 'Complete wireless infrastructure overhaul for all buildings.',
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: 'E-Rate FY25 Application Cycle',
      type: 'Compliance',
      ownerId: admin.id,
      startDate: new Date(currentYear + '-01-01'),
      endDate: new Date(currentYear + '-12-31'),
      status: 'IN_PROGRESS',
      notes: 'Annual E-Rate application and compliance tracking.',
    },
  });

  // Create milestones
  console.log('🎯 Creating milestones...');
  await Promise.all([
    prisma.projectMilestone.create({
      data: {
        projectId: project1.id,
        title: 'Site Survey Completion',
        dueDate: new Date(currentYear + '-06-15'),
        status: 'COMPLETED',
        assigneeId: contributor.id,
        notes: 'All building surveys completed ahead of schedule.',
      },
    }),
    prisma.projectMilestone.create({
      data: {
        projectId: project1.id,
        title: 'Equipment Procurement',
        dueDate: new Date(currentYear + '-07-01'),
        status: 'IN_PROGRESS',
        assigneeId: manager.id,
        notes: 'Ordered 45 access points. Delivery expected next week.',
      },
    }),
    prisma.projectMilestone.create({
      data: {
        projectId: project1.id,
        title: 'Installation Phase 1',
        dueDate: new Date(currentYear + '-08-01'),
        status: 'NOT_STARTED',
        assigneeId: contributor.id,
        notes: 'Main building installation.',
      },
    }),
    prisma.projectMilestone.create({
      data: {
        projectId: project2.id,
        title: 'Form 470 Submission',
        dueDate: new Date(currentYear + '-01-31'),
        status: 'COMPLETED',
        assigneeId: admin.id,
        notes: 'Submitted on January 10th.',
      },
    }),
    prisma.projectMilestone.create({
      data: {
        projectId: project2.id,
        title: 'Form 471 Submission',
        dueDate: new Date(currentYear + '-03-25'),
        status: 'COMPLETED',
        assigneeId: admin.id,
        notes: 'All applications submitted successfully.',
      },
    }),
  ]);

  // Create checklist items
  console.log('✅ Creating checklist items...');
  await Promise.all([
    prisma.checklistItem.create({
      data: {
        projectId: project1.id,
        description: 'Order mounting hardware and cables',
        dueDate: new Date(currentYear + '-06-20'),
        status: 'DONE',
        assigneeId: contributor.id,
      },
    }),
    prisma.checklistItem.create({
      data: {
        projectId: project1.id,
        description: 'Schedule installation with facilities',
        dueDate: new Date(currentYear + '-07-15'),
        status: 'IN_PROGRESS',
        assigneeId: manager.id,
      },
    }),
    prisma.checklistItem.create({
      data: {
        projectId: project1.id,
        description: 'Configure SSID and security settings',
        dueDate: new Date(currentYear + '-07-25'),
        status: 'TODO',
        assigneeId: contributor.id,
      },
    }),
    prisma.checklistItem.create({
      data: {
        projectId: project2.id,
        description: 'Gather vendor quotes',
        dueDate: new Date(currentYear + '-01-05'),
        status: 'DONE',
        assigneeId: manager.id,
      },
    }),
    prisma.checklistItem.create({
      data: {
        projectId: project2.id,
        description: 'Review USAC portal for updates',
        dueDate: new Date(currentYear + '-06-01'),
        status: 'TODO',
        assigneeId: admin.id,
      },
    }),
  ]);

  // Create settings
  console.log('⚙️  Creating settings...');
  await prisma.setting.create({
    data: {
      key: 'organization_name',
      value: { name: 'Sample School District' },
    },
  });

  await prisma.setting.create({
    data: {
      key: 'notification_settings',
      value: {
        enabled: true,
        reminderDays: 7,
        digestFrequency: 'weekly',
      },
    },
  });

  console.log('✨ Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log('  - Users: 4 (admin, manager, contributor, viewer)');
  console.log('  - Vendors: 5');
  console.log('  - Applications: 5');
  console.log('  - Compliance Documents: 5');
  console.log('  - Projects: 2');
  console.log('  - Milestones: 5');
  console.log('  - Checklist Items: 5');
  console.log('\n🔑 Login Credentials:');
  console.log('  Admin: admin@erate.local / admin123');
  console.log('  Manager: manager@erate.local / manager123');
  console.log('  Contributor: contributor@erate.local / contributor123');
  console.log('  Viewer: viewer@erate.local / viewer123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
