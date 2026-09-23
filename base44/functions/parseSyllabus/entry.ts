import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { syllabusText } = await req.json();
        
        if (!syllabusText || !syllabusText.trim()) {
            return Response.json({ 
                success: false, 
                error: 'Syllabus text is required' 
            });
        }

        console.log('Parsing comprehensive syllabus text of length:', syllabusText.length);

        const prompt = `
You are an expert academic parser specializing in comprehensive syllabus analysis. Your task is to extract ALL possible information from this complete course syllabus, including assignments, course structure, policies, and administrative details.

Syllabus Text:
${syllabusText}

COMPREHENSIVE EXTRACTION REQUIREMENTS:

1. ASSIGNMENTS & DELIVERABLES:
   - Extract EVERY assignment, exam, project, quiz, discussion, presentation, lab, etc.
   - Be extremely flexible with date formats (handle "Sept 15", "9/15/2024", "September 15th", "Week 5", "TBD", etc.)
   - Infer assignment types from context and keywords
   - Extract point values, percentages, weights when mentioned
   - Capture detailed descriptions, requirements, submission guidelines
   - Handle complex assignment structures (multi-part projects, ongoing assignments)
   - Extract due times if specified (e.g., "11:59 PM", "by midnight", "in class")

2. COURSE INFORMATION:
   - Learning objectives, course goals, outcomes
   - Weekly schedule, topics, readings
   - Textbook and material requirements
   - Grading breakdown and scale
   - Class meeting times and locations

3. POLICIES & PROCEDURES:
   - Attendance policy
   - Late assignment policy
   - Make-up exam policy
   - Academic integrity/plagiarism policy
   - Participation requirements
   - Extra credit opportunities
   - Communication preferences

4. FORMATTING HANDLING:
   - Parse tables, bullet points, numbered lists, paragraphs
   - Handle nested information and subcategories
   - Extract information from headers and subheaders
   - Process calendar layouts and schedule formats

5. INTELLIGENT INFERENCE:
   - For ambiguous dates, make reasonable academic calendar assumptions
   - Estimate dates for "Week X" references based on typical semester timing
   - Infer missing information from context
   - Handle incomplete or TBD information gracefully

For each assignment found, provide comprehensive details:
- name: Clear, descriptive name
- type: specific assignment type (essay, exam, quiz, project, homework, reading, discussion, presentation, lab, report, etc.)
- dueDate: YYYY-MM-DD format (estimate intelligently if needed)
- dueTime: if specified (e.g., "11:59 PM", "during class")
- description: Detailed requirements and guidelines
- points: Point value (as number)
- weight: Percentage of final grade (as number)
- category: Grade category (exams, assignments, participation, etc.)

Extract course information and policies comprehensively to provide complete academic context.
`;

        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    assignments: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                type: { type: "string" },
                                dueDate: { type: "string" },
                                dueTime: { type: "string" },
                                description: { type: "string" },
                                points: { type: "number" },
                                weight: { type: "number" },
                                category: { type: "string" }
                            },
                            required: ["name", "type", "dueDate"]
                        }
                    },
                    courseInfo: {
                        type: "object",
                        properties: {
                            objectives: {
                                type: "array",
                                items: { type: "string" }
                            },
                            schedule: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        week: { type: "string" },
                                        date: { type: "string" },
                                        topic: { type: "string" },
                                        readings: { type: "string" }
                                    }
                                }
                            },
                            gradingBreakdown: {
                                type: "object",
                                additionalProperties: { type: "number" }
                            },
                            gradingScale: {
                                type: "object",
                                additionalProperties: { type: "string" }
                            },
                            textbooks: {
                                type: "array",
                                items: { type: "string" }
                            }
                        }
                    },
                    policies: {
                        type: "object",
                        properties: {
                            attendance: { type: "string" },
                            lateAssignments: { type: "string" },
                            makeupExams: { type: "string" },
                            academicIntegrity: { type: "string" },
                            participation: { type: "string" },
                            extraCredit: { type: "string" },
                            communication: { type: "string" },
                            accommodations: { type: "string" }
                        }
                    },
                    totalFound: { type: "number" },
                    parseNotes: { type: "string" },
                    confidence: { 
                        type: "string", 
                        enum: ["high", "medium", "low"],
                        description: "Confidence level in the parsing accuracy" 
                    }
                },
                required: ["assignments", "totalFound"]
            }
        });

        console.log('AI Response:', aiResponse);

        if (!aiResponse || !aiResponse.assignments) {
            return Response.json({ 
                success: false, 
                error: 'Failed to parse syllabus. Please check the format and try again.' 
            });
        }

        // Validate and clean the assignments
        const validAssignments = aiResponse.assignments.filter(assignment => {
            return assignment.name && 
                   assignment.type && 
                   assignment.dueDate &&
                   assignment.name.trim().length > 0;
        }).map(assignment => ({
            ...assignment,
            name: assignment.name.trim(),
            type: assignment.type.toLowerCase().trim(),
            description: assignment.description ? assignment.description.trim() : null,
            dueTime: assignment.dueTime ? assignment.dueTime.trim() : null,
            category: assignment.category ? assignment.category.trim() : null
        }));

        console.log('Valid assignments found:', validAssignments.length);
        console.log('Course info extracted:', !!aiResponse.courseInfo);
        console.log('Policies extracted:', !!aiResponse.policies);

        return Response.json({
            success: true,
            assignments: validAssignments,
            courseInfo: aiResponse.courseInfo || null,
            policies: aiResponse.policies || null,
            totalFound: validAssignments.length,
            parseNotes: aiResponse.parseNotes || 'Comprehensive parsing completed successfully',
            confidence: aiResponse.confidence || 'medium',
            extractionSummary: {
                assignmentsFound: validAssignments.length,
                hasObjectives: !!(aiResponse.courseInfo?.objectives?.length),
                hasSchedule: !!(aiResponse.courseInfo?.schedule?.length),
                hasGradingBreakdown: !!(aiResponse.courseInfo?.gradingBreakdown),
                hasPolicies: !!aiResponse.policies && Object.keys(aiResponse.policies).some(key => aiResponse.policies[key])
            }
        });

    } catch (error) {
        console.error('Error parsing comprehensive syllabus:', error);
        return Response.json({ 
            success: false,
            error: error.message || 'Internal server error during comprehensive parsing'
        }, { status: 500 });
    }
});