import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const BUCKET = 'portfolio-media';
const supabaseReady = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const supabase = supabaseReady ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const $ = (id) => document.getElementById(id);
let currentUser = null;
let allPosts = [];
let selectedFiles = [];
let keptMedia = [];
let activeFilter = 'all';

$('year').textContent = new Date().getFullYear();

function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}
function showModal(id) { $(id).classList.remove('hidden'); }
function hideModal(id) { $(id).classList.add('hidden'); }
document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => hideModal(btn.dataset.close)));
document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.classList.add('hidden'); }));

$('adminEntry').addEventListener('click', async () => {
  if (!supabaseReady) {
    toast('Website setup is not finished yet. Follow the SETUP guide first.');
    return;
  }
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    currentUser = data.session.user;
    await refreshAdmin();
    showModal('adminModal');
  } else showModal('loginModal');
});

$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!supabaseReady) return;
  $('loginMessage').textContent = 'Signing in...';
  const { data, error } = await supabase.auth.signInWithPassword({
    email: $('loginEmail').value.trim(),
    password: $('loginPassword').value
  });
  if (error) {
    $('loginMessage').textContent = error.message;
    return;
  }
  currentUser = data.user;
  hideModal('loginModal');
  $('loginForm').reset();
  $('loginMessage').textContent = '';
  await refreshAdmin();
  showModal('adminModal');
});

$('logoutButton').addEventListener('click', async () => {
  await supabase.auth.signOut();
  currentUser = null;
  hideModal('adminModal');
  toast('You have signed out.');
});

$('newPostButton').addEventListener('click', () => openEditor());
$('postFiles').addEventListener('change', () => {
  selectedFiles = [...$('postFiles').files];
  renderFilePreview();
});

function renderFilePreview() {
  $('filePreview').innerHTML = '';
  selectedFiles.forEach((file, index) => {
    const item = document.createElement('div');
    item.className = 'preview-item';
    const url = URL.createObjectURL(file);
    const media = file.type.startsWith('video/') ? document.createElement('video') : document.createElement('img');
    media.src = url;
    if (media.tagName === 'VIDEO') media.muted = true;
    const remove = document.createElement('button');
    remove.type = 'button'; remove.textContent = '×';
    remove.addEventListener('click', () => {
      selectedFiles.splice(index, 1);
      const dt = new DataTransfer();
      selectedFiles.forEach(f => dt.items.add(f));
      $('postFiles').files = dt.files;
      renderFilePreview();
    });
    item.append(media, remove);
    $('filePreview').append(item);
  });
}

function openEditor(post = null) {
  $('postForm').reset();
  $('postId').value = post?.id || '';
  $('postTitle').value = post?.title || '';
  $('postCaption').value = post?.caption || '';
  $('postCategory').value = post?.category || 'Photography';
  $('postLocation').value = post?.location || '';
  selectedFiles = [];
  keptMedia = post?.media || [];
  $('postFiles').value = '';
  $('postMessage').textContent = '';
  $('filePreview').innerHTML = '';
  $('editorHeading').innerHTML = post ? 'Edit your <em>moment.</em>' : 'Create a <em>moment.</em>';
  $('publishButton').innerHTML = post ? 'Save changes <span>↗</span>' : 'Publish post <span>↗</span>';
  renderKeptMedia();
  hideModal('adminModal');
  showModal('postModal');
}
function renderKeptMedia() {
  $('existingMedia').innerHTML = '';
  keptMedia.forEach((m, index) => {
    const item = document.createElement('div');
    item.className = 'preview-item';
    const el = m.type === 'video' ? document.createElement('video') : document.createElement('img');
    el.src = m.url;
    if (el.tagName === 'VIDEO') el.muted = true;
    const remove = document.createElement('button');
    remove.type = 'button'; remove.textContent = '×'; remove.title = 'Remove this media';
    remove.addEventListener('click', () => { keptMedia.splice(index, 1); renderKeptMedia(); });
    item.append(el, remove);
    $('existingMedia').append(item);
  });
}

async function uploadFiles(files) {
  const uploaded = [];
  for (const file of files) {
    if (file.size > 50 * 1024 * 1024) throw new Error(`${file.name} is larger than 50 MB.`);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const path = `${currentUser.id}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    uploaded.push({ path, url: data.publicUrl, type: file.type.startsWith('video/') ? 'video' : 'image', name: file.name });
  }
  return uploaded;
}

$('postForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!currentUser) return;
  const title = $('postTitle').value.trim();
  if (!title) return;
  $('publishButton').disabled = true;
  $('postMessage').textContent = 'Saving your post...';
  let newMedia = [];
  try {
    newMedia = await uploadFiles(selectedFiles);
    const post = {
      title,
      caption: $('postCaption').value.trim(),
      category: $('postCategory').value,
      location: $('postLocation').value.trim(),
      media: [...keptMedia, ...newMedia],
      user_id: currentUser.id
    };
    const id = $('postId').value;
    let result;
    if (id) {
      result = await supabase.from('posts').update(post).eq('id', id).select().single();
    } else {
      result = await supabase.from('posts').insert(post).select().single();
    }
    if (result.error) throw result.error;
    hideModal('postModal');
    toast(id ? 'Your post has been updated.' : 'Your new post is live!');
    await loadPosts();
    await refreshAdmin();
    showModal('adminModal');
  } catch (error) {
    $('postMessage').textContent = error.message || 'Something went wrong. Please try again.';
  } finally {
    $('publishButton').disabled = false;
  }
});

async function deleteMedia(media) {
  const paths = media.map(m => m.path).filter(Boolean);
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
}
async function deletePost(post) {
  if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
  const { error } = await supabase.from('posts').delete().eq('id', post.id);
  if (error) { toast(error.message); return; }
  await deleteMedia(post.media || []);
  toast('Post deleted.');
  await loadPosts();
  await refreshAdmin();
}

async function refreshAdmin() {
  const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
  if (error) { $('adminStatus').textContent = error.message; return; }
  $('adminStatus').textContent = `${data.length} published ${data.length === 1 ? 'post' : 'posts'}`;
  $('adminPostList').innerHTML = '';
  if (!data.length) {
    $('adminPostList').innerHTML = '<p class="modal-subtitle">Your journal is waiting for its first post. Tap “Create a post” to begin.</p>';
    return;
  }
  data.forEach(post => {
    const row = document.createElement('div');
    row.className = 'admin-row';
    const thumb = document.createElement('img');
    thumb.className = 'admin-thumb';
    thumb.src = post.media?.[0]?.url || '';
    const info = document.createElement('div'); info.className = 'admin-row-info';
    const title = document.createElement('strong'); title.textContent = post.title;
    const meta = document.createElement('small'); meta.textContent = `${post.category} · ${post.media?.length || 0} media`;
    info.append(title, meta);
    const edit = document.createElement('button'); edit.className = 'small-action'; edit.textContent = 'Edit';
    edit.addEventListener('click', () => openEditor(post));
    const del = document.createElement('button'); del.className = 'small-action delete'; del.textContent = 'Delete';
    del.addEventListener('click', () => deletePost(post));
    row.append(thumb, info, edit, del);
    $('adminPostList').append(row);
  });
}

function createPostCard(post) {
  const card = document.createElement('article');
  card.className = 'post-card';
  const mediaWrap = document.createElement('div'); mediaWrap.className = 'post-media';
  const first = post.media?.[0];
  if (first?.url) {
    const media = first.type === 'video' ? document.createElement('video') : document.createElement('img');
    media.src = first.url;
    if (media.tagName === 'VIDEO') { media.controls = true; media.playsInline = true; }
    else media.alt = post.title;
    mediaWrap.append(media);
  } else {
    mediaWrap.style.display = 'grid';
    mediaWrap.style.placeItems = 'center';
    const placeholder = document.createElement('span'); placeholder.textContent = '✳'; placeholder.style.fontSize = '40px'; placeholder.style.color = '#bd684b';
    mediaWrap.append(placeholder);
  }
  if ((post.media?.length || 0) > 1) {
    const count = document.createElement('span'); count.className = 'media-count'; count.textContent = `＋${post.media.length - 1} more`; mediaWrap.append(count);
  }
  const meta = document.createElement('div'); meta.className = 'post-meta';
  const category = document.createElement('div'); category.className = 'post-category'; category.textContent = post.category || 'Moment';
  const title = document.createElement('h3'); title.className = 'post-title'; title.textContent = post.title;
  const caption = document.createElement('p'); caption.className = 'post-caption'; caption.textContent = post.caption || '';
  meta.append(category, title, caption);
  if (post.location) { const loc = document.createElement('div'); loc.className = 'post-location'; loc.textContent = `⌖ ${post.location}`; meta.append(loc); }
  card.append(mediaWrap, meta);
  return card;
}

async function loadPosts() {
  if (!supabaseReady) {
    $('emptyState').querySelector('h3').textContent = 'Your story starts here.';
    $('emptyState').querySelector('p').textContent = 'Connect your Supabase project to publish your first post.';
    return;
  }
  const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
  if (error) { toast('Could not load posts: ' + error.message); return; }
  allPosts = data || [];
  renderPosts();
}
function renderPosts() {
  $('postsGrid').innerHTML = '';
  const filtered = activeFilter === 'all' ? allPosts : allPosts.filter(p => p.category === activeFilter || (activeFilter === 'Video' && p.media?.some(m => m.type === 'video')));
  if (!filtered.length) {
    const empty = document.createElement('div'); empty.className = 'empty-state';
    const flower = document.createElement('div'); flower.className = 'empty-flower'; flower.textContent = '✳';
    const heading = document.createElement('h3'); heading.textContent = activeFilter === 'all' ? 'Your story starts here.' : 'More moments coming soon.';
    const text = document.createElement('p'); text.textContent = activeFilter === 'all' ? 'New photos and videos will appear here as they are published.' : 'Try another collection to explore more.';
    empty.append(flower, heading, text); $('postsGrid').append(empty); return;
  }
  filtered.forEach(p => $('postsGrid').append(createPostCard(p)));
}
$('filters').addEventListener('click', e => {
  const button = e.target.closest('[data-filter]');
  if (!button) return;
  activeFilter = button.dataset.filter;
  document.querySelectorAll('.filter').forEach(b => b.classList.toggle('active', b === button));
  renderPosts();
});

if (supabaseReady) {
  supabase.auth.onAuthStateChange((_event, session) => { currentUser = session?.user || null; });
}
loadPosts();
