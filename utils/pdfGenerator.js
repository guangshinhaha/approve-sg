const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Ensure reports directory exists
const reportsDir = 'reports';
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// Generate Report Card PDF
const generateReportCardPDF = async (reportCard, student) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      });

      const filename = `report-card-${student.studentId}-${reportCard.term}-${Date.now()}.pdf`;
      const filepath = path.join(reportsDir, filename);
      const stream = fs.createWriteStream(filepath);

      doc.pipe(stream);

      // Header
      doc.fontSize(20).text('SCHOOL REPORT CARD', { align: 'center' });
      doc.moveDown();

      // School Info
      doc.fontSize(10).text('School Name', { align: 'center' });
      doc.text('Address Line 1', { align: 'center' });
      doc.text('City, State, ZIP', { align: 'center' });
      doc.moveDown(2);

      // Student Info
      doc.fontSize(14).text('Student Information', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      doc.text(`Name: ${student.user.firstName} ${student.user.lastName}`);
      doc.text(`Student ID: ${student.studentId}`);
      doc.text(`Grade: ${reportCard.grade}`);
      doc.text(`Term: ${reportCard.term}`);
      doc.text(`Academic Year: ${reportCard.academicYear}`);
      doc.moveDown(2);

      // Academic Performance
      doc.fontSize(14).text('Academic Performance', { underline: true });
      doc.moveDown(0.5);

      // Table header
      const tableTop = doc.y;
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Course', 50, tableTop);
      doc.text('Grade', 300, tableTop);
      doc.text('Percentage', 400, tableTop);

      doc.font('Helvetica');
      let currentY = tableTop + 20;

      // Courses
      reportCard.courses.forEach(courseData => {
        doc.text(courseData.course.name, 50, currentY);
        doc.text(courseData.letterGrade || 'N/A', 300, currentY);
        doc.text(`${courseData.percentage || 0}%`, 400, currentY);
        currentY += 20;
      });

      doc.moveDown(2);

      // Overall Performance
      doc.fontSize(12).font('Helvetica-Bold').text('Overall Performance', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      doc.text(`GPA: ${reportCard.overallPerformance.gpa || 'N/A'}`);
      doc.text(`Overall Percentage: ${reportCard.overallPerformance.percentage || 'N/A'}%`);

      if (reportCard.overallPerformance.rank) {
        doc.text(`Class Rank: ${reportCard.overallPerformance.rank} / ${reportCard.overallPerformance.totalStudents}`);
      }

      doc.moveDown(2);

      // Attendance
      if (reportCard.attendance) {
        doc.fontSize(12).font('Helvetica-Bold').text('Attendance', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Total Days: ${reportCard.attendance.totalDays || 0}`);
        doc.text(`Present: ${reportCard.attendance.present || 0}`);
        doc.text(`Absent: ${reportCard.attendance.absent || 0}`);
        doc.text(`Attendance Rate: ${reportCard.attendance.attendanceRate || 0}%`);
        doc.moveDown(2);
      }

      // Comments
      if (reportCard.principalComments) {
        doc.fontSize(12).font('Helvetica-Bold').text('Principal Comments', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        doc.text(reportCard.principalComments, { align: 'justify' });
        doc.moveDown(2);
      }

      // Footer
      doc.fontSize(8).text(
        `Generated on ${new Date().toLocaleDateString()}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );

      doc.end();

      stream.on('finish', () => {
        resolve({
          filename,
          filepath,
          url: `/reports/${filename}`
        });
      });

      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
};

// Generate Fee Receipt PDF
const generateFeeReceiptPDF = async (payment, fee, student) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });

      const filename = `receipt-${payment.receiptNumber}-${Date.now()}.pdf`;
      const filepath = path.join(reportsDir, filename);
      const stream = fs.createWriteStream(filepath);

      doc.pipe(stream);

      // Header
      doc.fontSize(20).text('PAYMENT RECEIPT', { align: 'center' });
      doc.moveDown();

      // School Info
      doc.fontSize(10).text('School Name', { align: 'center' });
      doc.text('Address', { align: 'center' });
      doc.moveDown(2);

      // Receipt Info
      doc.fontSize(14).text(`Receipt No: ${payment.receiptNumber}`);
      doc.fontSize(10).text(`Date: ${payment.paymentDate.toLocaleDateString()}`);
      doc.moveDown();

      // Student Info
      doc.text(`Student Name: ${student.user.firstName} ${student.user.lastName}`);
      doc.text(`Student ID: ${student.studentId}`);
      doc.text(`Grade: ${student.grade}`);
      doc.moveDown(2);

      // Payment Details
      doc.fontSize(12).text('Payment Details', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      doc.text(`Fee Type: ${fee.feeType}`);
      doc.text(`Description: ${fee.description}`);
      doc.text(`Amount Paid: $${payment.amount.toFixed(2)}`);
      doc.text(`Payment Method: ${payment.paymentMethod}`);

      if (payment.transactionId) {
        doc.text(`Transaction ID: ${payment.transactionId}`);
      }

      doc.moveDown(2);

      // Balance Info
      doc.fontSize(12).text('Balance Information', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      doc.text(`Total Fee: $${fee.netAmount.toFixed(2)}`);
      doc.text(`Total Paid: $${fee.paidAmount.toFixed(2)}`);
      doc.text(`Balance: $${fee.balanceAmount.toFixed(2)}`);

      doc.moveDown(3);

      // Signature
      doc.fontSize(10).text('Received By: _________________');
      doc.moveDown();
      doc.text('Signature: _________________');

      // Footer
      doc.fontSize(8).text(
        'This is a computer-generated receipt',
        50,
        doc.page.height - 50,
        { align: 'center' }
      );

      doc.end();

      stream.on('finish', () => {
        resolve({
          filename,
          filepath,
          url: `/reports/${filename}`
        });
      });

      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
};

// Generate Attendance Report PDF
const generateAttendanceReportPDF = async (attendanceData, filters) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });

      const filename = `attendance-report-${Date.now()}.pdf`;
      const filepath = path.join(reportsDir, filename);
      const stream = fs.createWriteStream(filepath);

      doc.pipe(stream);

      // Header
      doc.fontSize(18).text('ATTENDANCE REPORT', { align: 'center' });
      doc.moveDown();

      // Filters
      doc.fontSize(10);
      if (filters.startDate) {
        doc.text(`Period: ${filters.startDate} to ${filters.endDate || 'Present'}`);
      }
      if (filters.grade) {
        doc.text(`Grade: ${filters.grade}`);
      }
      if (filters.section) {
        doc.text(`Section: ${filters.section}`);
      }
      doc.moveDown(2);

      // Statistics
      if (attendanceData.statistics) {
        const stats = attendanceData.statistics;
        doc.fontSize(12).text('Summary', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Total Records: ${stats.total}`);
        doc.text(`Present: ${stats.present}`);
        doc.text(`Absent: ${stats.absent}`);
        doc.text(`Late: ${stats.late}`);
        doc.text(`Attendance Rate: ${stats.attendanceRate}`);
        doc.moveDown(2);
      }

      // Detailed Records
      doc.fontSize(12).text('Detailed Records', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(8);

      const tableTop = doc.y;
      doc.text('Date', 50, tableTop);
      doc.text('Student', 120, tableTop);
      doc.text('Course', 250, tableTop);
      doc.text('Status', 350, tableTop);

      let currentY = tableTop + 15;

      attendanceData.data.slice(0, 30).forEach(record => {
        if (currentY > doc.page.height - 100) {
          doc.addPage();
          currentY = 50;
        }

        doc.text(new Date(record.date).toLocaleDateString(), 50, currentY);
        doc.text(
          record.student?.user ? `${record.student.user.firstName} ${record.student.user.lastName}` : 'N/A',
          120,
          currentY
        );
        doc.text(record.course?.name || 'N/A', 250, currentY);
        doc.text(record.status, 350, currentY);

        currentY += 15;
      });

      doc.end();

      stream.on('finish', () => {
        resolve({
          filename,
          filepath,
          url: `/reports/${filename}`
        });
      });

      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generateReportCardPDF,
  generateFeeReceiptPDF,
  generateAttendanceReportPDF
};
