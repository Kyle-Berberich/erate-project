import PDFDocument from 'pdfkit';
import { prisma } from '../index.js';

/**
 * Generate a monthly summary report
 */
export async function generateMonthlySummary(startDate: Date, endDate: Date): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
  const chunks: Buffer[] = [];

  doc.on('data', (chunk) => chunks.push(chunk));

  // Header
  doc
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('E-Rate Monthly Summary Report', { align: 'center' });

  doc.fontSize(10).font('Helvetica').text(
    `Report Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
    { align: 'center' }
  );

  doc.moveDown(2);

  // Get summary data
  const applications = await prisma.application.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      vendor: true,
    },
  });

  const financials = await prisma.application.aggregate({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    _sum: {
      amountRequested: true,
      amountCommitted: true,
      amountDisbursed: true,
    },
  });

  // Summary Statistics
  doc.fontSize(14).font('Helvetica-Bold').text('Summary Statistics');
  doc.moveDown(0.5);

  doc.fontSize(11).font('Helvetica');
  doc.text(`Total Applications: ${applications.length}`);
  doc.text(`Total Requested: $${(Number(financials._sum.amountRequested) || 0).toLocaleString()}`);
  doc.text(`Total Committed: $${(Number(financials._sum.amountCommitted) || 0).toLocaleString()}`);
  doc.text(`Total Disbursed: $${(Number(financials._sum.amountDisbursed) || 0).toLocaleString()}`);

  doc.moveDown(2);

  // Applications by Status
  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  doc.fontSize(14).font('Helvetica-Bold').text('Applications by Status');
  doc.moveDown(0.5);

  doc.fontSize(11).font('Helvetica');
  Object.entries(statusCounts).forEach(([status, count]) => {
    doc.text(`${status}: ${count}`);
  });

  doc.moveDown(2);

  // Applications Table
  if (applications.length > 0) {
    doc.fontSize(14).font('Helvetica-Bold').text('Applications Detail');
    doc.moveDown(0.5);

    // Table header
    const tableTop = doc.y;
    const colWidths = { frn: 80, name: 150, vendor: 120, status: 80, amount: 80 };

    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('FRN', 50, tableTop, { width: colWidths.frn });
    doc.text('Application Name', 130, tableTop, { width: colWidths.name });
    doc.text('Vendor', 280, tableTop, { width: colWidths.vendor });
    doc.text('Status', 400, tableTop, { width: colWidths.status });
    doc.text('Requested', 480, tableTop, { width: colWidths.amount });

    doc.moveDown(0.5);
    let yPos = doc.y;

    // Table rows
    doc.font('Helvetica').fontSize(8);
    applications.slice(0, 20).forEach((app, index) => {
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }

      doc.text(app.frn, 50, yPos, { width: colWidths.frn });
      doc.text(app.name.substring(0, 25), 130, yPos, { width: colWidths.name });
      doc.text(app.vendor.name.substring(0, 20), 280, yPos, { width: colWidths.vendor });
      doc.text(app.status, 400, yPos, { width: colWidths.status });
      doc.text(`$${Number(app.amountRequested).toLocaleString()}`, 480, yPos, { width: colWidths.amount });

      yPos += 20;
    });

    if (applications.length > 20) {
      doc.moveDown(1);
      doc.fontSize(9).text(`... and ${applications.length - 20} more applications`, { align: 'center' });
    }
  }

  // Footer
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc
      .fontSize(8)
      .text(
        `Page ${i + 1} of ${pageCount} | Generated on ${new Date().toLocaleString()}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );
  }

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
  });
}

/**
 * Generate application status report
 */
export async function generateApplicationStatusReport(): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
  const chunks: Buffer[] = [];

  doc.on('data', (chunk) => chunks.push(chunk));

  // Header
  doc
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('Application Status Report', { align: 'center' });

  doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });

  doc.moveDown(2);

  // Get applications
  const applications = await prisma.application.findMany({
    include: {
      vendor: true,
    },
    orderBy: {
      status: 'asc',
    },
  });

  // Group by status
  const statusGroups = applications.reduce((acc, app) => {
    if (!acc[app.status]) {
      acc[app.status] = [];
    }
    acc[app.status].push(app);
    return acc;
  }, {} as Record<string, typeof applications>);

  // Render each status group
  Object.entries(statusGroups).forEach(([status, apps]) => {
    doc.fontSize(14).font('Helvetica-Bold').text(`${status} (${apps.length})`, { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica');
    apps.forEach((app) => {
      doc.text(`FRN: ${app.frn}`);
      doc.text(`Name: ${app.name}`);
      doc.text(`Vendor: ${app.vendor.name}`);
      doc.text(`Category: ${app.category}`);
      doc.text(`Amount Requested: $${Number(app.amountRequested).toLocaleString()}`);
      doc.text(`Amount Committed: $${Number(app.amountCommitted).toLocaleString()}`);

      if (app.startDate) {
        doc.text(`Start Date: ${new Date(app.startDate).toLocaleDateString()}`);
      }
      if (app.endDate) {
        doc.text(`End Date: ${new Date(app.endDate).toLocaleDateString()}`);
      }

      doc.moveDown(1);

      if (doc.y > 700) {
        doc.addPage();
      }
    });

    doc.moveDown(1);
  });

  // Footer
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc
      .fontSize(8)
      .text(
        `Page ${i + 1} of ${pageCount} | Generated on ${new Date().toLocaleString()}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );
  }

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
  });
}

/**
 * Generate vendor performance report
 */
export async function generateVendorPerformanceReport(): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
  const chunks: Buffer[] = [];

  doc.on('data', (chunk) => chunks.push(chunk));

  // Header
  doc
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('Vendor Performance Report', { align: 'center' });

  doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });

  doc.moveDown(2);

  // Get vendors with aggregated data
  const vendors = await prisma.vendor.findMany({
    include: {
      applications: true,
    },
  });

  vendors.forEach((vendor) => {
    doc.fontSize(14).font('Helvetica-Bold').text(vendor.name, { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica');
    doc.text(`Contact: ${vendor.contactName}`);
    doc.text(`Email: ${vendor.contactEmail}`);
    doc.text(`Phone: ${vendor.contactPhone}`);
    doc.text(`Performance Rating: ${vendor.performanceRating}/5 stars`);

    if (vendor.contractValue) {
      doc.text(`Contract Value: $${Number(vendor.contractValue).toLocaleString()}`);
    }
    if (vendor.contractStart) {
      doc.text(`Contract Start: ${new Date(vendor.contractStart).toLocaleDateString()}`);
    }
    if (vendor.contractEnd) {
      doc.text(`Contract End: ${new Date(vendor.contractEnd).toLocaleDateString()}`);
    }

    doc.moveDown(0.5);

    // Application statistics
    const totalApplications = vendor.applications.length;
    const totalRequested = vendor.applications.reduce((sum, app) => sum + Number(app.amountRequested), 0);
    const totalCommitted = vendor.applications.reduce((sum, app) => sum + Number(app.amountCommitted), 0);
    const totalDisbursed = vendor.applications.reduce((sum, app) => sum + Number(app.amountDisbursed), 0);

    doc.fontSize(11).font('Helvetica-Bold').text('Application Summary:');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Total Applications: ${totalApplications}`);
    doc.text(`Total Requested: $${totalRequested.toLocaleString()}`);
    doc.text(`Total Committed: $${totalCommitted.toLocaleString()}`);
    doc.text(`Total Disbursed: $${totalDisbursed.toLocaleString()}`);

    if (vendor.notes) {
      doc.moveDown(0.5);
      doc.fontSize(9).text(`Notes: ${vendor.notes}`, { width: 500 });
    }

    doc.moveDown(2);

    if (doc.y > 650) {
      doc.addPage();
    }
  });

  // Footer
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc
      .fontSize(8)
      .text(
        `Page ${i + 1} of ${pageCount} | Generated on ${new Date().toLocaleString()}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );
  }

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
  });
}

/**
 * Generate compliance checklist report
 */
export async function generateComplianceChecklistReport(): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
  const chunks: Buffer[] = [];

  doc.on('data', (chunk) => chunks.push(chunk));

  // Header
  doc
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('Compliance Checklist Report', { align: 'center' });

  doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });

  doc.moveDown(2);

  // Get compliance documents
  const complianceDocs = await prisma.complianceDoc.findMany({
    include: {
      application: {
        include: {
          vendor: true,
        },
      },
    },
    orderBy: {
      status: 'asc',
    },
  });

  // Summary
  const totalDocs = complianceDocs.length;
  const approved = complianceDocs.filter((doc) => doc.status === 'APPROVED').length;
  const pending = complianceDocs.filter((doc) => doc.status === 'PENDING_REVIEW').length;
  const missing = complianceDocs.filter((doc) => doc.status === 'MISSING').length;
  const overdue = complianceDocs.filter(
    (doc) => doc.dateRequired && new Date(doc.dateRequired) < new Date() && doc.status !== 'APPROVED'
  ).length;

  doc.fontSize(14).font('Helvetica-Bold').text('Summary');
  doc.moveDown(0.5);

  doc.fontSize(11).font('Helvetica');
  doc.text(`Total Documents: ${totalDocs}`);
  doc.text(`Approved: ${approved}`, { continued: true }).text(` (${((approved / totalDocs) * 100).toFixed(1)}%)`);
  doc.text(`Pending Review: ${pending}`);
  doc.text(`Missing: ${missing}`);
  doc.text(`Overdue: ${overdue}`, { color: overdue > 0 ? 'red' : 'black' });

  doc.moveDown(2);

  // Group by status
  const statusGroups = complianceDocs.reduce((acc, doc) => {
    if (!acc[doc.status]) {
      acc[doc.status] = [];
    }
    acc[doc.status].push(doc);
    return acc;
  }, {} as Record<string, typeof complianceDocs>);

  // Render each status group
  Object.entries(statusGroups).forEach(([status, docs]) => {
    doc.fontSize(14).font('Helvetica-Bold').text(`${status} (${docs.length})`, { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(9).font('Helvetica');
    docs.forEach((docItem) => {
      const isOverdue =
        docItem.dateRequired && new Date(docItem.dateRequired) < new Date() && docItem.status !== 'APPROVED';

      doc.text(`☐ ${docItem.documentType}`, { continued: true });
      if (isOverdue) {
        doc.fillColor('red').text(' [OVERDUE]', { continued: false }).fillColor('black');
      } else {
        doc.text('');
      }

      doc.fontSize(8);
      doc.text(`  Application: ${docItem.application.name} (${docItem.application.frn})`);
      doc.text(`  Vendor: ${docItem.application.vendor.name}`);

      if (docItem.dateRequired) {
        doc.text(`  Due: ${new Date(docItem.dateRequired).toLocaleDateString()}`);
      }
      if (docItem.dateReceived) {
        doc.text(`  Received: ${new Date(docItem.dateReceived).toLocaleDateString()}`);
      }

      doc.fontSize(9);
      doc.moveDown(0.5);

      if (doc.y > 700) {
        doc.addPage();
      }
    });

    doc.moveDown(1);
  });

  // Footer
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc
      .fontSize(8)
      .text(
        `Page ${i + 1} of ${pageCount} | Generated on ${new Date().toLocaleString()}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );
  }

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
  });
}
