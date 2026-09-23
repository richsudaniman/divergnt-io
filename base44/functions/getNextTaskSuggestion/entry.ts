import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all incomplete tasks
        const allTasks = await base44.entities.Task.filter({ processingStatus: 'completed' });
        const incompleteTasks = allTasks.filter(task => !task.isCompleted);

        if (incompleteTasks.length === 0) {
            return Response.json({
                hasSuggestion: false,
                message: "🎉 Great job! You've completed all your tasks. Time to relax or create some new goals!"
            });
        }

        // Get phases and steps for incomplete tasks
        const taskAnalysis = [];
        
        for (const task of incompleteTasks) {
            const phases = await base44.entities.TaskPhase.filter({ taskId: task.id });
            const steps = await base44.entities.TaskStep.filter({ taskId: task.id });
            
            // Calculate task progress
            const totalSteps = steps.length;
            const completedSteps = steps.filter(s => s.isCompleted).length;
            const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
            
            // Find next incomplete phase/step
            const sortedPhases = phases.sort((a, b) => a.phaseOrder - b.phaseOrder);
            const nextIncompletePhase = sortedPhases.find(phase => {
                const phaseSteps = steps.filter(s => s.phaseId === phase.id);
                return phaseSteps.some(s => !s.isCompleted);
            });
            
            let nextStep = null;
            if (nextIncompletePhase) {
                const phaseSteps = steps
                    .filter(s => s.phaseId === nextIncompletePhase.id)
                    .sort((a, b) => a.stepOrder - b.stepOrder);
                nextStep = phaseSteps.find(s => !s.isCompleted);
            }
            
            // Calculate days until deadline
            const today = new Date();
            const deadline = new Date(task.deadline);
            const daysUntilDeadline = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
            
            taskAnalysis.push({
                task,
                progress,
                daysUntilDeadline,
                nextPhase: nextIncompletePhase,
                nextStep,
                urgencyScore: Math.max(1, 10 - daysUntilDeadline), // Higher score = more urgent
                progressScore: progress < 20 ? 10 : progress < 50 ? 7 : 5 // Favor tasks just started
            });
        }

        // Use AI to analyze and suggest the best next action
        const analysisPrompt = `
            You are an expert ADHD academic coach helping a student decide what to work on next.
            
            Current situation analysis:
            ${taskAnalysis.map(analysis => `
                Task: "${analysis.task.name}"
                - Days until deadline: ${analysis.daysUntilDeadline}
                - Progress: ${Math.round(analysis.progress)}%
                - Next phase: ${analysis.nextPhase?.title || 'None'}
                - Next step: ${analysis.nextStep?.title || 'None'}
                - Description: ${analysis.task.description?.substring(0, 200)}...
            `).join('\n')}
            
            Consider:
            - Deadline urgency (prioritize items due soon)
            - Task progress (balance starting new vs continuing existing)
            - Cognitive load (suggest clear, specific next actions)
            - ADHD-friendly approach (one focused action, not overwhelming)
            
            Provide ONE specific, actionable recommendation that reduces decision fatigue.
            
            Response format:
            - suggestion: Clear action like "Work on [Task] - [Phase]: [Step]"
            - reasoning: Why this is the best choice right now (1-2 sentences)
            - taskId: The ID of the recommended task
            - phaseId: The ID of the recommended phase (if applicable)
            - stepId: The ID of the recommended step (if applicable)
        `;

        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt: analysisPrompt,
            response_json_schema: {
                type: "object",
                properties: {
                    suggestion: { type: "string" },
                    reasoning: { type: "string" },
                    taskId: { type: "string" },
                    phaseId: { type: "string" },
                    stepId: { type: "string" }
                },
                required: ["suggestion", "reasoning", "taskId"]
            }
        });

        return Response.json({
            hasSuggestion: true,
            ...aiResponse
        });

    } catch (error) {
        console.error('Error getting task suggestion:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});