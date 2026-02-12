import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Users,
    CheckCircle,
    Clock,
    TrendingUp,
    AlertTriangle,
    Download,
    Loader2,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
    getClassAnalytics,
    getStudentPerformance,
    getStrugglingStudents,
    getClassLearningStyles,
    getRecentActivity,
    exportClassAnalytics,
} from '../services/analyticsService';

const VARK_COLORS = {
    visual: '#9333EA', // purple
    auditory: '#0891B2', // cyan
    reading_writing: '#059669', // emerald
    kinesthetic: '#DC2626', // red
};

export default function AnalyticsDashboard({ classId, className }) {
    const [analytics, setAnalytics] = useState(null);
    const [students, setStudents] = useState([]);
    const [strugglingStudents, setStrugglingStudents] = useState([]);
    const [learningStyles, setLearningStyles] = useState(null);
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        if (classId) {
            loadAnalytics();
        }
    }, [classId]);

    const loadAnalytics = async () => {
        try {
            const [analyticsData, studentsData, strugglingData, stylesData, activityData] = await Promise.all([
                getClassAnalytics(classId),
                getStudentPerformance(classId),
                getStrugglingStudents(classId),
                getClassLearningStyles(classId),
                getRecentActivity(classId, 10),
            ]);

            setAnalytics(analyticsData);
            setStudents(studentsData);
            setStrugglingStudents(strugglingData);
            setLearningStyles(stylesData);
            setRecentActivity(activityData);
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const csv = await exportClassAnalytics(classId);

            // Create download link
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${className || 'class'}_analytics_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting:', error);
            alert('Failed to export analytics');
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-600">No analytics data available yet.</p>
            </div>
        );
    }

    // Prepare learning style chart data
    const styleChartData = learningStyles ? [
        { name: 'Visual', value: learningStyles.visual_learners || 0, color: VARK_COLORS.visual },
        { name: 'Auditory', value: learningStyles.auditory_learners || 0, color: VARK_COLORS.auditory },
        { name: 'Reading/Writing', value: learningStyles.reading_writing_learners || 0, color: VARK_COLORS.reading_writing },
        { name: 'Kinesthetic', value: learningStyles.kinesthetic_learners || 0, color: VARK_COLORS.kinesthetic },
    ] : [];

    // Prepare student performance chart data (top 10)
    const performanceChartData = students.slice(0, 10).map(s => ({
        name: s.username?.substring(0, 10) || 'Student',
        completion: s.completion_rate || 0,
    }));

    return (
        <div className="space-y-6">
            {/* Export Button */}
            <div className="flex justify-end">
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleExport}
                    disabled={exporting}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                    {exporting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Exporting...
                        </>
                    ) : (
                        <>
                            <Download className="w-4 h-4" />
                            Export CSV
                        </>
                    )}
                </motion.button>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    icon={Users}
                    label="Total Students"
                    value={analytics.total_students || 0}
                    color="purple"
                />
                <StatCard
                    icon={CheckCircle}
                    label="Completion Rate"
                    value={`${Math.round(analytics.completion_rate || 0)}%`}
                    color="green"
                />
                <StatCard
                    icon={Clock}
                    label="Avg Time"
                    value={`${Math.round((analytics.avg_time_per_assignment || 0) / 60)} min`}
                    color="blue"
                />
                <StatCard
                    icon={TrendingUp}
                    label="Avg Progress"
                    value={`${Math.round(analytics.avg_progress || 0)}%`}
                    color="amber"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Learning Style Distribution */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-100">
                    <h3 className="text-lg font-serif font-bold text-gray-900 mb-4">
                        Learning Style Distribution
                    </h3>
                    {styleChartData.filter(d => d.value > 0).length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={styleChartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {styleChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            No student data yet
                        </div>
                    )}
                </div>

                {/* Student Performance */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-100">
                    <h3 className="text-lg font-serif font-bold text-gray-900 mb-4">
                        Top Student Performance
                    </h3>
                    {performanceChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={performanceChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                                <YAxis domain={[0, 100]} />
                                <Tooltip />
                                <Bar dataKey="completion" fill="#9333EA" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            No student data yet
                        </div>
                    )}
                </div>
            </div>

            {/* Struggling Students Alert */}
            {strugglingStudents.length > 0 && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertTriangle className="w-6 h-6 text-amber-600" />
                        <h3 className="text-lg font-serif font-bold text-amber-900">
                            Students Needing Attention ({strugglingStudents.length})
                        </h3>
                    </div>
                    <div className="space-y-2">
                        {strugglingStudents.slice(0, 5).map((student) => (
                            <div
                                key={student.student_id}
                                className="flex items-center justify-between p-3 bg-white rounded-xl"
                            >
                                <div>
                                    <p className="font-semibold text-gray-900">{student.username}</p>
                                    <p className="text-sm text-gray-600">{student.struggling_reason}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-amber-700">
                                        {Math.round(student.completion_rate)}% complete
                                    </p>
                                    {student.overdue_count > 0 && (
                                        <p className="text-xs text-red-600">
                                            {student.overdue_count} overdue
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Activity Feed */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-100">
                <h3 className="text-lg font-serif font-bold text-gray-900 mb-4">
                    Recent Activity
                </h3>
                {recentActivity.length > 0 ? (
                    <div className="space-y-3">
                        {recentActivity.map((activity, index) => (
                            <div
                                key={index}
                                className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors"
                            >
                                <div
                                    className={`w-2 h-2 rounded-full mt-2 ${
                                        activity.activity_type === 'completion'
                                            ? 'bg-green-500'
                                            : activity.activity_type === 'started'
                                            ? 'bg-blue-500'
                                            : 'bg-gray-400'
                                    }`}
                                />
                                <div className="flex-1">
                                    <p className="text-sm text-gray-900">
                                        <span className="font-semibold">{activity.student_name}</span>{' '}
                                        {activity.activity_type === 'completion' ? 'completed' : 'started'}{' '}
                                        <span className="font-semibold">{activity.material_title}</span>
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(activity.activity_time).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        No recent activity
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color }) {
    const colorClasses = {
        purple: 'bg-purple-100 text-purple-600 border-purple-100',
        green: 'bg-green-100 text-green-600 border-green-100',
        blue: 'bg-blue-100 text-blue-600 border-blue-100',
        amber: 'bg-amber-100 text-amber-600 border-amber-100',
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-100"
        >
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-sm text-gray-600 font-medium">{label}</p>
                    <p className="text-3xl font-serif font-bold text-gray-900">{value}</p>
                </div>
            </div>
        </motion.div>
    );
}
