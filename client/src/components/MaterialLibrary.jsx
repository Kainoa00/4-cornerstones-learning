import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    File,
    FileText,
    Image as ImageIcon,
    Video,
    Link as LinkIcon,
    Search,
    Filter,
    MoreVertical,
    Trash2,
    Edit,
    Share2,
    Check,
    Loader2,
    Sparkles,
    AlertCircle,
} from 'lucide-react';
import { getMyMaterials, deleteMaterial } from '../services/materialService';

const CONTENT_TYPE_ICONS = {
    pdf: { icon: File, color: 'red' },
    text: { icon: FileText, color: 'blue' },
    image: { icon: ImageIcon, color: 'purple' },
    video: { icon: Video, color: 'pink' },
    link: { icon: LinkIcon, color: 'green' },
};

export default function MaterialLibrary({ onShareClick }) {
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterSubject, setFilterSubject] = useState('all');
    const [activeMenu, setActiveMenu] = useState(null);

    useEffect(() => {
        loadMaterials();
    }, []);

    const loadMaterials = async () => {
        try {
            const data = await getMyMaterials();
            setMaterials(data);
        } catch (error) {
            console.error('Error loading materials:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (materialId) => {
        if (!confirm('Are you sure you want to delete this material and all its transformations?')) {
            return;
        }

        try {
            await deleteMaterial(materialId);
            setMaterials(materials.filter((m) => m.id !== materialId));
            setActiveMenu(null);
        } catch (error) {
            console.error('Error deleting material:', error);
            alert('Failed to delete material');
        }
    };

    // Filter materials
    const filteredMaterials = materials.filter((material) => {
        const matchesSearch =
            material.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            material.description?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesSubject = filterSubject === 'all' || material.subject === filterSubject;

        return matchesSearch && matchesSubject;
    });

    // Get unique subjects for filter
    const subjects = ['all', ...new Set(materials.map((m) => m.subject).filter(Boolean))];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search materials..."
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                    />
                </div>

                {/* Subject Filter */}
                <div className="relative">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                        value={filterSubject}
                        onChange={(e) => setFilterSubject(e.target.value)}
                        className="pl-12 pr-8 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none appearance-none bg-white min-w-[200px]"
                    >
                        {subjects.map((subject) => (
                            <option key={subject} value={subject}>
                                {subject === 'all' ? 'All Subjects' : subject}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Materials Grid */}
            {filteredMaterials.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border-2 border-gray-100">
                    <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-10 h-10 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-serif font-bold text-gray-900 mb-2">
                        {searchQuery || filterSubject !== 'all' ? 'No materials found' : 'No materials yet'}
                    </h3>
                    <p className="text-gray-600">
                        {searchQuery || filterSubject !== 'all'
                            ? 'Try adjusting your search or filters'
                            : 'Upload your first learning material to get started'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMaterials.map((material, index) => (
                        <MaterialCard
                            key={material.id}
                            material={material}
                            index={index}
                            activeMenu={activeMenu}
                            setActiveMenu={setActiveMenu}
                            onDelete={handleDelete}
                            onShare={onShareClick}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function MaterialCard({ material, index, activeMenu, setActiveMenu, onDelete, onShare }) {
    const typeConfig = CONTENT_TYPE_ICONS[material.content_type] || CONTENT_TYPE_ICONS.text;
    const TypeIcon = typeConfig.icon;

    const getTransformationStatus = () => {
        if (material.is_transformed) {
            return { text: 'Transformed', color: 'green', icon: Check };
        } else if (material.transformation_progress > 0) {
            return { text: `${material.transformation_progress}%`, color: 'yellow', icon: Loader2 };
        } else if (material.transformation_error) {
            return { text: 'Failed', color: 'red', icon: AlertCircle };
        } else {
            return { text: 'Pending', color: 'gray', icon: Sparkles };
        }
    };

    const status = getTransformationStatus();
    const StatusIcon = status.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * index }}
            whileHover={{ y: -4 }}
            className="group relative bg-white rounded-2xl shadow-lg border-2 border-gray-100 hover:border-purple-200 hover:shadow-xl transition-all overflow-hidden"
        >
            {/* Type indicator corner */}
            <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
                <svg viewBox="0 0 80 80" className="w-full h-full">
                    <path d="M 0 0 L 80 0 L 0 80 Z" fill={`var(--${typeConfig.color}-500)`} />
                </svg>
            </div>

            <div className="relative z-10 p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 bg-${typeConfig.color}-100 rounded-xl flex items-center justify-center`}>
                        <TypeIcon className={`w-6 h-6 text-${typeConfig.color}-600`} />
                    </div>

                    {/* Menu */}
                    <div className="relative">
                        <button
                            onClick={() => setActiveMenu(activeMenu === material.id ? null : material.id)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <MoreVertical className="w-5 h-5 text-gray-600" />
                        </button>

                        <AnimatePresence>
                            {activeMenu === material.id && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border-2 border-gray-100 py-2 z-20"
                                >
                                    <button
                                        onClick={() => {
                                            onShare(material);
                                            setActiveMenu(null);
                                        }}
                                        className="w-full px-4 py-2 text-left hover:bg-purple-50 flex items-center gap-2 text-gray-700 hover:text-purple-700 transition-colors"
                                    >
                                        <Share2 className="w-4 h-4" />
                                        Share to Class
                                    </button>
                                    <button
                                        onClick={() => {
                                            // Edit functionality
                                            setActiveMenu(null);
                                        }}
                                        className="w-full px-4 py-2 text-left hover:bg-blue-50 flex items-center gap-2 text-gray-700 hover:text-blue-700 transition-colors"
                                    >
                                        <Edit className="w-4 h-4" />
                                        Edit Details
                                    </button>
                                    <div className="border-t border-gray-100 my-2"></div>
                                    <button
                                        onClick={() => onDelete(material.id)}
                                        className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-red-600 hover:text-red-700 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Content */}
                <div className="mb-4">
                    <h3 className="text-lg font-serif font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-purple-700 transition-colors">
                        {material.title}
                    </h3>
                    {material.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{material.description}</p>
                    )}
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {material.subject && (
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                            {material.subject}
                        </span>
                    )}
                    {material.grade_level && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            {material.grade_level}
                        </span>
                    )}
                </div>

                {/* Transformation Status */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                        <StatusIcon
                            className={`w-4 h-4 ${
                                status.color === 'green'
                                    ? 'text-green-600'
                                    : status.color === 'yellow'
                                    ? 'text-yellow-600 animate-spin'
                                    : status.color === 'red'
                                    ? 'text-red-600'
                                    : 'text-gray-400'
                            }`}
                        />
                        <span
                            className={`text-sm font-medium ${
                                status.color === 'green'
                                    ? 'text-green-700'
                                    : status.color === 'yellow'
                                    ? 'text-yellow-700'
                                    : status.color === 'red'
                                    ? 'text-red-700'
                                    : 'text-gray-500'
                            }`}
                        >
                            {status.text}
                        </span>
                    </div>

                    {material.is_transformed && (
                        <div className="flex gap-1">
                            {['visual', 'auditory', 'reading_writing', 'kinesthetic'].map((style) => {
                                const icons = { visual: '👁️', auditory: '👂', reading_writing: '📖', kinesthetic: '✋' };
                                return (
                                    <span key={style} className="text-sm" title={style}>
                                        {icons[style]}
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
