import { jsPDF } from "jspdf";
import { PDFDocument } from "pdf-lib";
import { Course, Tutorial, Lesson, CodingChallenge, Quiz, Announcement } from "../types";

// Helper to draw the professional PowerCode Academy branding
function drawPageDecorations(doc: jsPDF, pageTitle: string, pageNumber: number = 1) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Draw light grey background watermark diagonal text
  doc.setTextColor(245, 245, 245);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  doc.text("POWERCODE ACADEMY OFFICIAL", 30, pageHeight / 2 - 30, { angle: 30 });
  doc.text("SECURITY ASSESSMENT COPY", 20, pageHeight / 2 + 50, { angle: 30 });

  // Draw primary orange colored accent header line
  doc.setDrawColor(255, 123, 0); // #ff7b00 primary orange
  doc.setLineWidth(1.5);
  doc.line(14, 28, pageWidth - 14, 28);

  // Draw logo badge (orange rectangle with "P<" white symbols code logo)
  doc.setFillColor(255, 123, 0);
  doc.rect(14, 10, 10, 10, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("courier", "bold");
  doc.setFontSize(8);
  doc.text("P<", 15.5, 16.5);

  // Logo Text Label
  doc.setTextColor(13, 17, 23); // Slate
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("PowerCode Academy", 28, 17);

  // Header Context Label (Right aligned)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(pageTitle.toUpperCase(), pageWidth - 14, 17, { align: "right" });

  // Footer Accent line
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

  // Footer info
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("© 2026 PowerCode Academy. All rights reserved.", 14, pageHeight - 10);
  doc.text(`Page ${pageNumber}`, pageWidth - 14, pageHeight - 10, { align: "right" });
}

// Wrap text gracefully and return the updated Y coordinate
function addWrappedParagraph(doc: jsPDF, text: string, x: number, startY: number, maxWidth: number, lineHeight: number = 6): number {
  let y = startY;
  const lines = doc.splitTextToSize(text, maxWidth);
  const pageHeight = doc.internal.pageSize.getHeight();

  for (const line of lines) {
    if (y > pageHeight - 25) {
      doc.addPage();
      y = 35; // Start on new page below header line
      drawPageDecorations(doc, "Continued Section");
    }
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

// Generate single jsPDF document bytes as Uint8Array
export function compileCourseToDoc(course: Course): jsPDF {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  drawPageDecorations(doc, "Course Syllabus");

  let y = 38;
  doc.setTextColor(13, 17, 23);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  y = addWrappedParagraph(doc, course.title, 14, y, 180, 8);

  // Meta row
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(255, 123, 0); // Orange
  const tag = course.isPremium ? "⭐ PRO ACCESS" : "🆓 FREE COURSES";
  doc.text(`${tag}  |  Enrollment Fee: $${course.price || "0.00"}`, 14, y);
  y += 8;

  // Description
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  y = addWrappedParagraph(doc, course.description || "No description provided.", 14, y, 180, 5);
  y += 5;

  // Syllabus / Modules Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(13, 17, 23);
  doc.text("ACADEMY SYLLABUS OUTLINE", 14, y);
  doc.line(14, y + 1.5, 80, y + 1.5);
  y += 8;

  if (course.modules && course.modules.length > 0) {
    course.modules.forEach((mod, mIdx) => {
      // Module Title Banner
      doc.setFillColor(245, 245, 245);
      doc.rect(14, y, 182, 7, "F");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(13, 17, 23);
      doc.text(`${mIdx + 1}. ${mod.title || "Untitled Module"}`, 16, y + 5);
      y += 11;

      if (mod.lessons && mod.lessons.length > 0) {
        mod.lessons.forEach((les, lIdx) => {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(255, 123, 0); // Orange lesson prefix
          doc.text(`[Lesson ${mIdx + 1}.${lIdx + 1}]`, 16, y);
          
          doc.setFont("helvetica", "bold");
          doc.setTextColor(13, 17, 23);
          doc.text(les.title || "Untitled Lesson", 45, y);
          y += 5;

          // Lesson details or content excerpt
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(80, 80, 80);
          const excerpt = les.content || "Lesson content references terminal exercise worksheets.";
          y = addWrappedParagraph(doc, excerpt, 18, y, 175, 4.5);
          
          doc.setFont("courier", "normal");
          doc.setFontSize(8);
          doc.setTextColor(110, 110, 110);
          doc.text(`Duration: ${les.durationMinutes || 10} min | Preview: ${les.isPreviewAllowed ? "Yes" : "No"}`, 18, y);
          y += 8;
        });
      } else {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text("No lessons added to this syllabus module.", 18, y);
        y += 8;
      }
    });
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text("Syllabus modules are currently in design.", 14, y);
  }

  return doc;
}

export function compileTutorialToDoc(tutorial: Tutorial): jsPDF {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  drawPageDecorations(doc, "Tutorial Worksheet");

  let y = 38;
  doc.setTextColor(13, 17, 23);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  y = addWrappedParagraph(doc, tutorial.title, 14, y, 180, 8);

  // Meta row
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(255, 123, 0); // Orange
  doc.text(`Category: ${tutorial.category || "General"}  |  Code Language: ${tutorial.languageSlug || "javascript"}`, 14, y);
  y += 8;

  // Content
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  y = addWrappedParagraph(doc, tutorial.content || "No worksheet tutorial notes.", 14, y, 180, 5.5);
  y += 8;

  // Code Block Box
  if (tutorial.codeSnippet) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(13, 17, 23);
    doc.text("STARTER OR INSTRUCTIONAL SNIPPET", 14, y);
    doc.line(14, y + 1.5, 85, y + 1.5);
    y += 7;

    // Draw dark box for code
    const snippetLines = doc.splitTextToSize(tutorial.codeSnippet, 170);
    const boxHeight = snippetLines.length * 4.5 + 8;

    // Check if box fits on page, otherwise break
    if (y + boxHeight > doc.internal.pageSize.getHeight() - 25) {
      doc.addPage();
      y = 35;
      drawPageDecorations(doc, "Tutorial Worksheet - Code");
    }

    doc.setFillColor(13, 17, 23); // Slate dark code background
    doc.rect(14, y, 182, boxHeight, "F");

    doc.setFont("courier", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(138, 203, 116); // Soft green color codes
    
    let codeY = y + 5;
    snippetLines.forEach((line: string) => {
      doc.text(line, 18, codeY);
      codeY += 4.5;
    });
    y += boxHeight + 10;
  }

  return doc;
}

export function compileLessonToDoc(courseTitle: string, moduleTitle: string, lesson: Lesson): jsPDF {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  drawPageDecorations(doc, "Lesson Worksheet Study Notes");

  let y = 38;
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`${courseTitle.toUpperCase()}  👉  ${moduleTitle.toUpperCase()}`, 14, y);
  y += 6;

  doc.setTextColor(13, 17, 23);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  y = addWrappedParagraph(doc, lesson.title, 14, y, 180, 8);

  // Metadata badge
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9.5);
  doc.setTextColor(255, 123, 0);
  doc.text(`Estimated Reading: ${lesson.durationMinutes || 10} minutes  |  Preview Access: ${lesson.isPreviewAllowed ? "YES" : "NO"}`, 14, y);
  y += 8;

  // Lesson Content
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  y = addWrappedParagraph(doc, lesson.content || "Worksheet references and lecture details.", 14, y, 180, 5.5);

  return doc;
}

export function compileChallengeToDoc(challenge: CodingChallenge): jsPDF {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  drawPageDecorations(doc, "Algorithm Lab Specification");

  let y = 38;
  doc.setTextColor(13, 17, 23);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  y = addWrappedParagraph(doc, challenge.title, 14, y, 180, 7.5);

  // Specification metadata
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(255, 123, 0);
  doc.text(`Difficulty: ${challenge.difficulty || "MEDIUM"}  |  Reward Capital: ${challenge.points || 15} XP Points  |  Category: ${challenge.category || "Algorithms"}`, 14, y);
  y += 8;

  // Description
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  y = addWrappedParagraph(doc, challenge.description, 14, y, 180, 5.5);
  y += 8;

  // Sandbox Starter Code
  if (challenge.starterCode) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(13, 17, 23);
    doc.text("SANDBOX STARTER WORKSPACE CODE", 14, y);
    y += 5;

    const codeLines = doc.splitTextToSize(challenge.starterCode, 170);
    const boxHeight = codeLines.length * 4.5 + 8;

    if (y + boxHeight > doc.internal.pageSize.getHeight() - 25) {
      doc.addPage();
      y = 35;
      drawPageDecorations(doc, "Challenge Lab - Code Space");
    }

    doc.setFillColor(13, 17, 23);
    doc.rect(14, y, 182, boxHeight, "F");

    doc.setFont("courier", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 123, 0); // Orange code color for challenge
    
    let codeY = y + 5;
    codeLines.forEach((line: string) => {
      doc.text(line, 18, codeY);
      codeY += 4.5;
    });
    y += boxHeight + 8;
  }

  // Verifications Test Cases
  if (challenge.testCases && challenge.testCases.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(13, 17, 23);
    doc.text("VALIDATION CASES TEST SUITE", 14, y);
    y += 6;

    challenge.testCases.forEach((tc, idx) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(`Case #${idx + 1}:`, 14, y);

      doc.setFont("courier", "bold");
      doc.setTextColor(255, 123, 0);
      doc.text(`Input: "${JSON.stringify(tc.input)}"`, 35, y);
      
      doc.setTextColor(13, 17, 23);
      doc.text(`Expected Output: "${JSON.stringify(tc.output)}"`, 105, y);
      y += 6;
    });
  }

  return doc;
}

export function compileQuizToDoc(quiz: Quiz, studentName: string, score: number, userAnswers?: { [key: number]: string }): jsPDF {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  drawPageDecorations(doc, "Quiz Evaluation Ledger");

  let y = 38;
  doc.setTextColor(13, 17, 23);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  y = addWrappedParagraph(doc, `Quiz Assessment: ${quiz.title}`, 14, y, 180, 7.5);

  // Student Score Summary Box
  doc.setFillColor(245, 245, 245);
  doc.rect(14, y, 182, 18, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(13, 17, 23);
  doc.text(`STUDENT PROFILE CONTEXT:`, 18, y + 5);
  doc.text(`EVALUATION SCORE WEIGHT:`, 110, y + 5);

  doc.setFont("helvetica", "normal");
  doc.text(studentName || "Academics Student Candidate", 18, y + 11);

  const passedStatus = score >= (quiz.passingScore || 70);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(passedStatus ? 34 : 220, passedStatus ? 139 : 38, passedStatus ? 34 : 38); // Green vs red
  doc.text(`${score}% / 100% (${passedStatus ? "PASSED ASSESSMENT ✔" : "FAILED PROGRESS ✘"})`, 110, y + 11);
  y += 24;

  // Questions Review
  doc.setTextColor(13, 17, 23);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("ASSESSMENTS SPECIFIC LEDGER QUESTIONS", 14, y);
  doc.line(14, y + 1.5, 95, y + 1.5);
  y += 8;

  if (quiz.questions && quiz.questions.length > 0) {
    quiz.questions.forEach((q, idx) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(13, 17, 23);
      y = addWrappedParagraph(doc, `Q${idx + 1}: ${q.question}`, 14, y, 180, 5);
      y += 1;

      // Draw active options
      q.options.forEach((opt) => {
        const isCorrectOpt = opt === q.correctAnswer;
        const userAnsweredThis = userAnswers ? userAnswers[q.id] === opt : false;

        doc.setFont("helvetica", isCorrectOpt ? "bold" : "normal");
        doc.setFontSize(9);
        
        let optionPrefix = "  [ ] ";
        if (isCorrectOpt) {
          doc.setTextColor(34, 139, 34); // Green
          optionPrefix = "  [✔] ";
        } else if (userAnsweredThis) {
          doc.setTextColor(220, 38, 38); // Red
          optionPrefix = "  [✘] ";
        } else {
          doc.setTextColor(90, 90, 90);
        }

        doc.text(`${optionPrefix}${opt}`, 18, y);
        y += 4.5;
      });

      // Show footer notes on user response
      if (userAnswers && userAnswers[q.id]) {
        y += 1;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5);
        if (userAnswers[q.id] === q.correctAnswer) {
          doc.setTextColor(34, 139, 34);
          doc.text("Candidate response was accurate. Yielded maximum evaluation coefficient points.", 18, y);
        } else {
          doc.setTextColor(217, 83, 79);
          doc.text(`Candidate selection: "${userAnswers[q.id] || "None"}" (Incorrect). Correct key: "${q.correctAnswer}"`, 18, y);
        }
        y += 5.5;
      }

      y += 4; // Margin between questions
    });
  }

  return doc;
}

export function compileAnnouncementToDoc(ann: Announcement): jsPDF {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  drawPageDecorations(doc, "Official Announcement");

  let y = 38;
  doc.setTextColor(13, 17, 23);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  y = addWrappedParagraph(doc, ann.title, 14, y, 180, 7.5);

  // Metadata badge
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9.5);
  doc.setTextColor(255, 123, 0);
  doc.text(`Published On: ${new Date(ann.createdAt).toLocaleDateString()}  |  Priority level: ${ann.isImportant ? "URGENT HIGH PRIORITY 🔥" : "NORMAL BUDGET"}`, 14, y);
  y += 8;

  // Announcement Content
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(60, 60, 60);
  y = addWrappedParagraph(doc, ann.content || "No announcement content provided.", 14, y, 180, 5.5);

  return doc;
}

export async function exportSelectedItemsToPdf(
  items: { type: "course" | "tutorial" | "challenge" | "announcement" | "pdf"; data: any }[]
) {
  if (items.length === 0) return;

  try {
    const mergedDoc = await PDFDocument.create();

    for (const item of items) {
      let jspdfDoc: jsPDF;

      if (item.type === "course") {
        jspdfDoc = compileCourseToDoc(item.data);
      } else if (item.type === "tutorial") {
        jspdfDoc = compileTutorialToDoc(item.data);
      } else if (item.type === "challenge") {
        jspdfDoc = compileChallengeToDoc(item.data);
      } else if (item.type === "announcement") {
        jspdfDoc = compileAnnouncementToDoc(item.data);
      } else if (item.type === "pdf") {
        // Create an index abstract copy
        jspdfDoc = new jsPDF({ format: "a4", unit: "mm" });
        drawPageDecorations(jspdfDoc, "Registered PDF Resource Abstract");
        let y = 40;
        jspdfDoc.setFont("helvetica", "bold");
        jspdfDoc.setFontSize(16);
        y = addWrappedParagraph(jspdfDoc, `Document Resource: ${item.data.title}`, 14, y, 180, 7.5);
        
        jspdfDoc.setFont("helvetica", "bold");
        jspdfDoc.setFontSize(9.5);
        jspdfDoc.setTextColor(255, 123, 0);
        jspdfDoc.text(`Author: ${item.data.author || "Unknown"} | Category: ${item.data.category || "General"} | License: ${item.data.isPremium ? "PRO CAPTIVES" : "FREE ACCESS"}`, 14, y);
        y += 8;

        jspdfDoc.setFont("helvetica", "normal");
        jspdfDoc.setFontSize(10);
        jspdfDoc.setTextColor(70, 70, 70);
        y = addWrappedParagraph(jspdfDoc, `This is an official index abstract copy of the reference book published inside PowerCode Academy database. Adherent students can fetch, read or print download instances of the PDF file from the remote link provided at:`, 14, y, 180, 5.5);
        
        jspdfDoc.setFont("courier", "bold");
        jspdfDoc.setFontSize(9);
        jspdfDoc.setTextColor(255, 123, 0);
        y = addWrappedParagraph(jspdfDoc, item.data.fileUrl || "No remote link url", 14, y + 2, 180, 5);
      } else {
        continue;
      }

      // Convert jsPDF document into raw ArrayBuffer/Uint8Array
      const arrayBuffer = jspdfDoc.output("arraybuffer");
      
      // Load current document inside pdf-lib
      const pdfLibDoc = await PDFDocument.load(arrayBuffer);
      const copiedPages = await mergedDoc.copyPages(pdfLibDoc, pdfLibDoc.getPageIndices());
      copiedPages.forEach((page) => mergedDoc.addPage(page));
    }

    // Save consolidated merge
    const mergedPdfBytes = await mergedDoc.save();

    // Trigger local client browser file download of the unified PDF blob
    const blob = new Blob([mergedPdfBytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `PowerCode_Academy_Combined_Report_${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("Critical combined PDF packaging pipeline failure: ", err);
    alert("Combined PDF generation failed. Ensure your selected data lists are valid.");
  }
}

// Unified export service object
export const pdfExportService = {
  compileCourseToDoc,
  compileTutorialToDoc,
  compileLessonToDoc,
  compileChallengeToDoc,
  compileQuizToDoc,
  compileAnnouncementToDoc,
  downloadCourse(course: Course) {
    const doc = compileCourseToDoc(course);
    doc.save(`PowerCode_Course_${course.id || "Syllabus"}.pdf`);
  },
  downloadTutorial(tutorial: Tutorial) {
    const doc = compileTutorialToDoc(tutorial);
    doc.save(`PowerCode_Tutorial_${tutorial.id || "Worksheet"}.pdf`);
  },
  downloadLesson(courseTitle: string, moduleTitle: string, lesson: Lesson) {
    const doc = compileLessonToDoc(courseTitle, moduleTitle, lesson);
    doc.save(`PowerCode_Lesson_${lesson.id || "StudyNotes"}.pdf`);
  },
  downloadChallenge(challenge: CodingChallenge) {
    const doc = compileChallengeToDoc(challenge);
    doc.save(`PowerCode_Challenge_${challenge.id || "Specification"}.pdf`);
  },
  downloadQuizResult(quiz: Quiz, studentName: string, score: number, userAnswers?: { [key: number]: string }) {
    const doc = compileQuizToDoc(quiz, studentName, score, userAnswers);
    doc.save(`PowerCode_QuizResult_${quiz.id || "Evaluation"}.pdf`);
  },
  downloadAnnouncement(ann: Announcement) {
    const doc = compileAnnouncementToDoc(ann);
    doc.save(`PowerCode_Announcement_${ann.id || "Official"}.pdf`);
  },
  exportSelectedItemsToPdf
};
