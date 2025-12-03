import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Clock, Tag, Loader, ChevronRight, Feather } from 'lucide-react';
import { GlassCard } from '../components/UIComponents';
import { FirebaseService } from '../firebaseService';

interface BlogViewProps {
  onBack: () => void;
}

export const BlogView: React.FC<BlogViewProps> = ({ onBack }) => {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [selectedBlog, setSelectedBlog] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBlogs();
  }, []);

  const loadBlogs = async () => {
    setIsLoading(true);
    try {
      const data = await FirebaseService.getBlogPosts(true);
      setBlogs(data);
    } catch (err) {
      console.error('Error loading blogs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateReadTime = (content: string) => {
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min read`;
  };

  const renderMarkdown = (content: string) => {
    let html = content
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold text-white mt-8 mb-4">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-white mt-10 mb-4">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-white mt-12 mb-6">$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong class="font-bold text-white">$1</strong>')
      .replace(/\*(.*)\*/gim, '<em class="italic">$1</em>')
      .replace(/`(.*?)`/gim, '<code class="bg-white/10 px-2 py-0.5 rounded text-primary font-mono text-sm">$1</code>')
      .replace(/\n\n/gim, '</p><p class="text-gray-300 leading-relaxed mb-4">')
      .replace(/\n/gim, '<br/>');
    
    return `<p class="text-gray-300 leading-relaxed mb-4">${html}</p>`;
  };

  // Blog detail view
  if (selectedBlog) {
    return (
      <div className="min-h-screen">
        {/* Header */}
        <div className="border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
            <button
              onClick={() => setSelectedBlog(null)}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="text-sm">Back to Blog</span>
            </button>
          </div>
        </div>

        {/* Article */}
        <article className="max-w-4xl mx-auto px-4 py-8 pb-24">
          {/* Cover Image */}
          {selectedBlog.coverImage && (
            <div className="rounded-2xl overflow-hidden mb-8 border border-white/5">
              <img
                src={selectedBlog.coverImage}
                alt={selectedBlog.title}
                className="w-full h-64 md:h-96 object-cover"
              />
            </div>
          )}

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <Calendar size={14} />
              {formatDate(selectedBlog.createdAt)}
            </div>
            <div className="flex items-center gap-2">
              <Clock size={14} />
              {calculateReadTime(selectedBlog.content)}
            </div>
            <span className="text-gray-600">•</span>
            <span className="text-primary">{selectedBlog.author}</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
            {selectedBlog.title}
          </h1>

          {/* Tags */}
          {selectedBlog.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {selectedBlog.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full border border-primary/20"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Content */}
          <div 
            className="prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedBlog.content) }}
          />
        </article>
      </div>
    );
  }

  // Blog list view
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-white/5 bg-black/20 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-6 md:py-12">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">Back to Home</span>
          </button>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <Feather size={24} className="text-black" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">Blog</h1>
              <p className="text-gray-400">Insights, updates, and stories from BSN</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 pb-24">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader size={32} className="text-primary animate-spin" />
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Feather size={40} className="text-gray-600" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No posts yet</h2>
            <p className="text-gray-500">Check back soon for updates!</p>
          </div>
        ) : (
          <div className="grid gap-6 md:gap-8">
            {/* Featured Post (First) */}
            {blogs.length > 0 && (
              <div
                onClick={() => setSelectedBlog(blogs[0])}
                className="group cursor-pointer"
              >
                <GlassCard className="overflow-hidden hover:border-primary/30 transition-all duration-300">
                  <div className="md:flex">
                    {blogs[0].coverImage && (
                      <div className="md:w-1/2 h-64 md:h-auto overflow-hidden">
                        <img
                          src={blogs[0].coverImage}
                          alt={blogs[0].title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <div className={`p-6 md:p-8 ${blogs[0].coverImage ? 'md:w-1/2' : 'w-full'}`}>
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        {blogs[0].tags?.slice(0, 2).map((tag: string) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                        <span className="text-gray-500 text-sm">
                          {formatDate(blogs[0].createdAt)}
                        </span>
                      </div>
                      <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 group-hover:text-primary transition-colors">
                        {blogs[0].title}
                      </h2>
                      <p className="text-gray-400 mb-4 line-clamp-3">
                        {blogs[0].excerpt || blogs[0].content.substring(0, 200)}...
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-500">{blogs[0].author}</span>
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-500">{calculateReadTime(blogs[0].content)}</span>
                        <ChevronRight size={16} className="text-primary ml-auto group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </div>
            )}

            {/* Other Posts Grid */}
            {blogs.length > 1 && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {blogs.slice(1).map((blog) => (
                  <div
                    key={blog.id}
                    onClick={() => setSelectedBlog(blog)}
                    className="group cursor-pointer"
                  >
                    <GlassCard className="h-full overflow-hidden hover:border-primary/30 transition-all duration-300">
                      {blog.coverImage && (
                        <div className="h-48 overflow-hidden">
                          <img
                            src={blog.coverImage}
                            alt={blog.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      )}
                      <div className="p-5">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          {blog.tags?.slice(0, 1).map((tag: string) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                          <span className="text-gray-500 text-xs">
                            {formatDate(blog.createdAt)}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-primary transition-colors line-clamp-2">
                          {blog.title}
                        </h3>
                        <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                          {blog.excerpt || blog.content.substring(0, 100)}...
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{blog.author}</span>
                          <span>{calculateReadTime(blog.content)}</span>
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
