import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Clock, Tag, Loader, ChevronRight, Feather, User, Sparkles } from 'lucide-react';
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
        {/* Sticky Header */}
        <div className="border-b border-white/5 bg-black/40 backdrop-blur-2xl sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
            <button
              onClick={() => setSelectedBlog(null)}
              className="flex items-center gap-2 text-gray-400 hover:text-primary transition-all duration-300 group"
            >
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
              </div>
              <span className="text-sm font-medium">Back to Blog</span>
            </button>
          </div>
        </div>

        {/* Article */}
        <article className="max-w-4xl mx-auto px-6 py-10 pb-24">
          {/* Cover Image */}
          {selectedBlog.coverImage && (
            <div className="rounded-3xl overflow-hidden mb-10 border border-white/10 shadow-2xl shadow-black/50">
              <img
                src={selectedBlog.coverImage}
                alt={selectedBlog.title}
                className="w-full h-72 md:h-[400px] object-cover"
              />
            </div>
          )}

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <Calendar size={14} className="text-primary" />
              <span className="text-sm text-gray-300">{formatDate(selectedBlog.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <Clock size={14} className="text-primary" />
              <span className="text-sm text-gray-300">{calculateReadTime(selectedBlog.content)}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <User size={14} className="text-primary" />
              <span className="text-sm text-primary font-medium">{selectedBlog.author}</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-8 leading-tight tracking-tight">
            {selectedBlog.title}
          </h1>

          {/* Tags */}
          {selectedBlog.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-10 pb-10 border-b border-white/10">
              {selectedBlog.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="px-4 py-1.5 bg-gradient-to-r from-primary/20 to-primary/10 text-primary text-sm rounded-full border border-primary/30 font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Content */}
          <div 
            className="prose prose-invert max-w-none prose-p:text-gray-300 prose-headings:text-white"
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
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="relative border-b border-white/5 bg-black/20 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-6 py-8 md:py-14">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-400 hover:text-primary transition-all duration-300 mb-8 group"
            >
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
              </div>
              <span className="text-sm font-medium">Back to Home</span>
            </button>
            
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Blog</h1>
              <p className="text-gray-400 mt-1 text-lg">Insights, updates, and stories from BSN</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-10 pb-24">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Loader size={28} className="text-primary animate-spin" />
            </div>
            <p className="text-gray-500">Loading posts...</p>
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-24 h-24 bg-gradient-to-br from-white/10 to-white/5 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-white/10">
              <Feather size={44} className="text-gray-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">No posts yet</h2>
            <p className="text-gray-500 text-lg max-w-md mx-auto">We're working on some great content. Check back soon for updates!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Featured Post (First) */}
            {blogs.length > 0 && (
              <div
                onClick={() => setSelectedBlog(blogs[0])}
                className="group cursor-pointer"
              >
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 hover:border-primary/40 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10">
                  <div className="md:flex">
                    {blogs[0].coverImage ? (
                      <div className="md:w-1/2 h-72 md:h-80 overflow-hidden relative">
                        <img
                          src={blogs[0].coverImage}
                          alt={blogs[0].title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20 md:bg-gradient-to-l md:from-black/40 md:to-transparent" />
                      </div>
                    ) : (
                      <div className="md:w-1/2 h-72 md:h-80 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center">
                        <Sparkles size={64} className="text-primary/40" />
                      </div>
                    )}
                    <div className="md:w-1/2 p-8 md:p-10 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="px-3 py-1 bg-primary text-black text-xs font-bold rounded-full uppercase tracking-wide">
                          Featured
                        </span>
                        <span className="text-gray-500 text-sm">
                          {formatDate(blogs[0].createdAt)}
                        </span>
                      </div>
                      <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 group-hover:text-primary transition-colors duration-300 leading-tight">
                        {blogs[0].title}
                      </h2>
                      <p className="text-gray-400 mb-6 line-clamp-3 text-lg leading-relaxed">
                        {blogs[0].excerpt || blogs[0].content.substring(0, 200)}...
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                              <User size={14} className="text-primary" />
                            </div>
                            <span className="text-gray-300 font-medium">{blogs[0].author}</span>
                          </div>
                          <span className="text-gray-600">|</span>
                          <span className="text-gray-500">{calculateReadTime(blogs[0].content)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-primary font-medium">
                          <span className="text-sm">Read article</span>
                          <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Other Posts Grid */}
            {blogs.length > 1 && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {blogs.slice(1).map((blog, index) => (
                  <div
                    key={blog.id}
                    onClick={() => setSelectedBlog(blog)}
                    className="group cursor-pointer"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="h-full overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1">
                      {blog.coverImage ? (
                        <div className="h-48 overflow-hidden relative">
                          <img
                            src={blog.coverImage}
                            alt={blog.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        </div>
                      ) : (
                        <div className="h-48 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent flex items-center justify-center">
                          <Feather size={40} className="text-primary/30" />
                        </div>
                      )}
                      <div className="p-6">
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          {blog.tags?.slice(0, 1).map((tag: string) => (
                            <span
                              key={tag}
                              className="px-2.5 py-0.5 bg-primary/15 text-primary text-xs rounded-full font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                          <span className="text-gray-500 text-xs">
                            {formatDate(blog.createdAt)}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3 group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                          {blog.title}
                        </h3>
                        <p className="text-gray-400 text-sm line-clamp-2 mb-4 leading-relaxed">
                          {blog.excerpt || blog.content.substring(0, 100)}...
                        </p>
                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                              <User size={12} className="text-gray-400" />
                            </div>
                            <span className="text-gray-400 text-xs font-medium">{blog.author}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                            <Clock size={12} />
                            <span>{calculateReadTime(blog.content)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
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
