import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 🔧 speechToText function called (OpenAI Whisper)`);
    
    try {
        const base44 = createClientFromRequest(req);
        
        if (!(await base44.auth.isAuthenticated())) {
            console.log(`[${timestamp}] ❌ Authentication failed`);
            return new Response(JSON.stringify({ 
                error: 'Unauthorized',
                success: false 
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`[${timestamp}] ✅ User authenticated`);

        // Parse request body
        const requestBody = await req.json();
        const { audioData, mimeType } = requestBody;
        
        console.log(`[${timestamp}] 📊 Received audioData length:`, audioData?.length || 0);
        console.log(`[${timestamp}] 📊 MIME type:`, mimeType);
        
        if (!audioData || !mimeType) {
            console.log(`[${timestamp}] ❌ Missing audio data or mimeType`);
            return new Response(JSON.stringify({ 
                error: 'Missing audio data or mimeType',
                success: false 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const apiKey = Deno.env.get("OPENAI_API_KEY");
        if (!apiKey) {
            console.log(`[${timestamp}] ❌ No OpenAI API key found`);
            return new Response(JSON.stringify({ 
                error: 'OpenAI API key missing',
                success: false 
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`[${timestamp}] ✅ OpenAI API key found`);

        // Convert base64 to bytes
        console.log(`[${timestamp}] 🔄 Converting base64 to bytes...`);
        let binaryString;
        try {
            binaryString = atob(audioData);
        } catch (error) {
            console.error(`[${timestamp}] ❌ Invalid base64 data:`, error);
            return new Response(JSON.stringify({ 
                error: 'Invalid base64 audio data',
                success: false 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        console.log(`[${timestamp}] ✅ Converted to bytes:`, bytes.length);

        // Create FormData for OpenAI Whisper API
        console.log(`[${timestamp}] 🔄 Building FormData for OpenAI Whisper...`);
        const formData = new FormData();
        
        const audioBlob = new Blob([bytes], { type: mimeType });
        formData.append('file', audioBlob, 'recording.webm');
        formData.append('model', 'whisper-1');
        formData.append('language', 'en'); // Can be made dynamic if needed
        
        console.log(`[${timestamp}] ✅ FormData built with whisper-1 model`);
        console.log(`[${timestamp}] 📊 Audio blob size:`, audioBlob.size, 'bytes');

        // Call OpenAI Whisper API
        console.log(`[${timestamp}] 🌐 Calling OpenAI Whisper API...`);

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${apiKey}`
            },
            body: formData
        });

        console.log(`[${timestamp}] 📡 OpenAI response status:`, response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.log(`[${timestamp}] ❌ OpenAI error:`, response.status, errorText);
            
            let errorDetails = errorText;
            try {
                const errorJson = JSON.parse(errorText);
                errorDetails = errorJson.error?.message || errorJson.message || errorText;
            } catch (parseError) {
                // Keep original error text
            }
            
            return new Response(JSON.stringify({ 
                error: 'OpenAI Whisper API error',
                details: errorDetails,
                status: response.status,
                success: false 
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const result = await response.json();
        console.log(`[${timestamp}] ✅ OpenAI response:`, result);
        
        // Extract text from response
        const transcriptionText = result.text || '';
        
        console.log(`[${timestamp}] ✅ Extracted text:`, transcriptionText);
        
        // Validate that we actually got some text
        if (!transcriptionText || transcriptionText.trim().length === 0) {
            console.log(`[${timestamp}] ❌ Empty transcription text`);
            return new Response(JSON.stringify({ 
                error: 'Empty transcription result',
                details: 'OpenAI Whisper returned empty text. Try speaking louder or closer to the microphone.',
                success: false 
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        return new Response(JSON.stringify({
            text: transcriptionText.trim(),
            success: true,
            audioSize: bytes.length,
            processingTime: Date.now() - new Date(timestamp).getTime()
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error(`[${timestamp}] ❌ Function error:`, error);
        console.error(`[${timestamp}] ❌ Error stack:`, error.stack);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            message: error.message,
            success: false
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});