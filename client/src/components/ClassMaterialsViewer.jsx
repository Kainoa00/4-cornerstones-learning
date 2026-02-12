import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    BookOpen,
    Eye,
    Ear,
    FileText,
    Hand,
    Sparkles,
    ArrowLeft,
    Loader2,
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import ReactMarkdown from 'react-markdown';

const VARK_ICONS = {
    visual: Eye,
    auditory: Ear,
    reading_writing: FileText,
    kinesthetic: Hand,
};

const VARK_LABELS = {
    visual: 'Visual',
    auditory: 'Auditory',
    reading_writing: 'Reading/Writing',
    kinesthetic: 'Kinesthetic',
};

const VARK_STYLES = {
    visual: {
        banner: 'bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200',
        bannerIcon: 'text-blue-600',
        bannerText: 'text-blue-900',
        bannerDesc: 'text-blue-700',
        card: 'bg-gradient-to-br from-blue-50 via-white to-blue-50 border-4 border-blue-400 shadow-2xl ring-4 ring-blue-200',
        badge: 'bg-blue-600',
        border: 'border-blue-300',
        icon: 'text-blue-600',
        heading: 'text-blue-900',
    },
    auditory: {
        banner: 'bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-200',
        bannerIcon: 'text-green-600',
        bannerText: 'text-green-900',
        bannerDesc: 'text-green-700',
        card: 'bg-gradient-to-br from-green-50 via-white to-green-50 border-4 border-green-400 shadow-2xl ring-4 ring-green-200',
        badge: 'bg-green-600',
        border: 'border-green-300',
        icon: 'text-green-600',
        heading: 'text-green-900',
    },
    reading_writing: {
        banner: 'bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-purple-200',
        bannerIcon: 'text-purple-600',
        bannerText: 'text-purple-900',
        bannerDesc: 'text-purple-700',
        card: 'bg-gradient-to-br from-purple-50 via-white to-purple-50 border-4 border-purple-400 shadow-2xl ring-4 ring-purple-200',
        badge: 'bg-purple-600',
        border: 'border-purple-300',
        icon: 'text-purple-600',
        heading: 'text-purple-900',
    },
    kinesthetic: {
        banner: 'bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-200',
        bannerIcon: 'text-orange-600',
        bannerText: 'text-orange-900',
        bannerDesc: 'text-orange-700',
        card: 'bg-gradient-to-br from-orange-50 via-white to-orange-50 border-4 border-orange-400 shadow-2xl ring-4 ring-orange-200',
        badge: 'bg-orange-600',
        border: 'border-orange-300',
        icon: 'text-orange-600',
        heading: 'text-orange-900',
    },
};

export default function ClassMaterialsViewer({ classId, className, onClose, dominantStyle }) {
    const [materials, setMaterials] = useState([]);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (classId) {
            loadMaterials();
        }
    }, [classId]);

    const loadMaterials = async () => {
        try {
            setLoading(true);

            // Get materials for this class
            const { data: classMaterials, error: cmError } = await supabase
                .from('class_materials')
                .select(`
                    material_id,
                    materials (
                        id,
                        title,
                        description,
                        content,
                        type,
                        created_at
                    )
                `)
                .eq('class_id', classId);

            if (cmError) throw cmError;

            const materialsData = classMaterials.map(cm => cm.materials).filter(Boolean);
            setMaterials(materialsData);

            // Auto-select first material
            if (materialsData.length > 0) {
                setSelectedMaterial(materialsData[0]);
            }
        } catch (error) {
            console.error('Error loading materials:', error);
        } finally {
            setLoading(false);
        }
    };

    const parseVARKSections = (content) => {
        if (!content) return [];

        const sections = [];
        const lines = content.split('\n');
        let currentSection = null;
        let currentContent = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Check for VARK section headers
            if (line.match(/^##\s+(VISUAL|AUDITORY|READING\/WRITING|KINESTHETIC):/i)) {
                // Save previous section
                if (currentSection) {
                    sections.push({
                        type: currentSection,
                        content: currentContent.join('\n'),
                    });
                }

                // Start new section
                const match = line.match(/^##\s+(VISUAL|AUDITORY|READING\/WRITING|KINESTHETIC):/i);
                const type = match[1].toLowerCase().replace('/', '_');
                currentSection = type;
                currentContent = [line];
            } else if (currentSection) {
                // Check if we hit a new major section (not VARK)
                if (line.startsWith('## ') && !line.match(/^##\s+(VISUAL|AUDITORY|READING\/WRITING|KINESTHETIC):/i)) {
                    // Save current VARK section
                    sections.push({
                        type: currentSection,
                        content: currentContent.join('\n'),
                    });
                    currentSection = null;
                    currentContent = [];
                } else {
                    currentContent.push(line);
                }
            }
        }

        // Save last section
        if (currentSection) {
            sections.push({
                type: currentSection,
                content: currentContent.join('\n'),
            });
        }

        return sections;
    };

    const varkSections = selectedMaterial ? parseVARKSections(selectedMaterial.content) : [];
    const hasVARKSections = varkSections.length > 0;

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="bg-white rounded-2xl p-8 shadow-2xl">
                    <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto" />
                    <p className="mt-4 text-gray-600 font-medium">Loading materials...</p>
                </div>
            </div>
        );
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
                <div className="min-h-screen px-4 py-8">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 relative overflow-hidden">
                            <div className="absolute inset-0 bg-black/10"></div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={onClose}
                                        className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                                    >
                                        <ArrowLeft className="w-6 h-6" />
                                    </button>
                                    <div>
                                        <h2 className="text-3xl font-serif font-bold">{className}</h2>
                                        <p className="text-white/80 mt-1">
                                            {materials.length} material{materials.length !== 1 ? 's' : ''} available
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex flex-col lg:flex-row min-h-[600px]">
                            {/* Sidebar - Materials List */}
                            <div className="lg:w-80 border-b lg:border-b-0 lg:border-r border-gray-200 bg-gray-50">
                                <div className="p-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <BookOpen className="w-5 h-5 text-purple-600" />
                                        Materials
                                    </h3>
                                    <div className="space-y-2">
                                        {materials.map((material) => (
                                            <button
                                                key={material.id}
                                                onClick={() => setSelectedMaterial(material)}
                                                className={`w-full text-left p-4 rounded-xl transition-all ${
                                                    selectedMaterial?.id === material.id
                                                        ? 'bg-purple-600 text-white shadow-lg'
                                                        : 'bg-white hover:bg-gray-100 text-gray-900'
                                                }`}
                                            >
                                                <h4 className="font-semibold mb-1">{material.title}</h4>
                                                {material.description && (
                                                    <p className={`text-sm line-clamp-2 ${
                                                        selectedMaterial?.id === material.id
                                                            ? 'text-white/80'
                                                            : 'text-gray-600'
                                                    }`}>
                                                        {material.description}
                                                    </p>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Main Content Area */}
                            <div className="flex-1 overflow-y-auto max-h-[calc(100vh-200px)]">
                                {selectedMaterial ? (
                                    <div className="p-8">
                                        {/* Material Header */}
                                        <div className="mb-8">
                                            <h1 className="text-4xl font-serif font-bold text-gray-900 mb-3">
                                                {selectedMaterial.title}
                                            </h1>
                                            {selectedMaterial.description && (
                                                <p className="text-lg text-gray-600">
                                                    {selectedMaterial.description}
                                                </p>
                                            )}
                                        </div>

                                        {/* VARK Personalization Banner */}
                                        {hasVARKSections && dominantStyle && VARK_STYLES[dominantStyle] && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`mb-8 p-6 ${VARK_STYLES[dominantStyle].banner} rounded-2xl`}
                                            >
                                                <div className="flex items-center gap-3 mb-2">
                                                    <Sparkles className={`w-6 h-6 ${VARK_STYLES[dominantStyle].bannerIcon}`} />
                                                    <h3 className={`text-xl font-bold ${VARK_STYLES[dominantStyle].bannerText}`}>
                                                        Personalized for Your Learning Style
                                                    </h3>
                                                </div>
                                                <p className={VARK_STYLES[dominantStyle].bannerDesc}>
                                                    This material has been adapted for <strong>{VARK_LABELS[dominantStyle]} learners</strong>.
                                                    Your personalized section is highlighted below.
                                                </p>
                                            </motion.div>
                                        )}

                                        {/* VARK Sections */}
                                        {hasVARKSections ? (
                                            <div className="space-y-6">
                                                {varkSections.map((section, index) => {
                                                    const Icon = VARK_ICONS[section.type];
                                                    const isPersonalized = section.type === dominantStyle;
                                                    const styles = VARK_STYLES[section.type] || {};

                                                    return (
                                                        <motion.div
                                                            key={index}
                                                            initial={{ opacity: 0, y: 20 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: index * 0.1 }}
                                                            className={`relative rounded-2xl transition-all ${
                                                                isPersonalized
                                                                    ? styles.card
                                                                    : 'bg-white border-2 border-gray-200'
                                                            }`}
                                                        >
                                                            {/* Personalized Badge */}
                                                            {isPersonalized && (
                                                                <div className={`absolute -top-3 -right-3 ${styles.badge} text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-10`}>
                                                                    <Sparkles className="w-4 h-4" />
                                                                    <span className="text-sm font-bold">Your Style!</span>
                                                                </div>
                                                            )}

                                                            <div className="p-6">
                                                                {/* Section Header */}
                                                                <div className={`flex items-center gap-3 mb-4 pb-4 border-b-2 ${
                                                                    isPersonalized ? styles.border : 'border-gray-200'
                                                                }`}>
                                                                    {Icon && <Icon className={`w-6 h-6 ${styles.icon}`} />}
                                                                    <h3 className={`text-2xl font-bold ${
                                                                        isPersonalized ? styles.heading : 'text-gray-900'
                                                                    }`}>
                                                                        {VARK_LABELS[section.type]}
                                                                    </h3>
                                                                </div>

                                                                {/* Section Content */}
                                                                <div className="prose prose-lg max-w-none">
                                                                    <ReactMarkdown>{section.content}</ReactMarkdown>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="prose prose-lg max-w-none">
                                                <ReactMarkdown>{selectedMaterial.content}</ReactMarkdown>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full p-12">
                                        <div className="text-center">
                                            <BookOpen className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                                            <p className="text-xl text-gray-600 font-medium">
                                                Select a material to view
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </AnimatePresence>
    );
}
