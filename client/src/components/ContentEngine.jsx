import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import { Loader2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import Mermaid from './Mermaid';
import { API_URL } from '../config';

export default function ContentEngine({ textContent, initialStyle }) {
    const [currentStyle, setCurrentStyle] = useState(initialStyle || 'Visual');
    const [generatedContent, setGeneratedContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const styles = ['Visual', 'Auditory', 'Reading/Writing', 'Kinesthetic'];

    useEffect(() => {
        if (textContent) {
            handleGenerate(currentStyle);
        }
    }, [textContent]); // Re-run if text changes, or we could make it manual

    const handleGenerate = async (style) => {
        setIsLoading(true);
        setCurrentStyle(style);

        try {
            const response = await axios.post(`${API_URL}/api/transform`, {
                text: textContent,
                style: style,
                subject: 'Course Material' // Could be dynamic
            });
            setGeneratedContent(response.data.content);
        } catch (error) {
            console.error("Content generation failed", error);
            setGeneratedContent("**Error**: Failed to generate content. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Style Selector */}
            <div className="flex flex-wrap gap-2 mb-6 p-1 bg-gray-100/50 rounded-xl w-fit mx-auto">
                {styles.map((style) => (
                    <button
                        key={style}
                        onClick={() => handleGenerate(style)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentStyle === style
                            ? 'bg-white shadow-sm text-purple-700'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                            }`}
                    >
                        {style}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="relative min-h-[400px] bg-white rounded-2xl border border-gray-100 shadow-sm p-8 overflow-y-auto">
                {isLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10 backdrop-blur-sm">
                        <Loader2 className="w-10 h-10 text-purple-600 animate-spin mb-4" />
                        <p className="text-gray-500 font-medium">Transforming content to {currentStyle} style...</p>
                    </div>
                ) : null}

                <motion.div
                    key={currentStyle + generatedContent.substring(0, 10)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="prose prose-purple max-w-none"
                >
                    <ReactMarkdown
                        components={{
                            code(props) {
                                const { children, className, node, ...rest } = props
                                const match = /language-mermaid/.exec(className || '')
                                return match ? (
                                    <Mermaid chart={String(children).replace(/\n$/, '')} />
                                ) : (
                                    <code {...rest} className={className}>
                                        {children}
                                    </code>
                                )
                            }
                        }}
                    >
                        {generatedContent}
                    </ReactMarkdown>
                </motion.div>
            </div>
        </div>
    );
}
