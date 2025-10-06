const { describe, it, expect, beforeEach, afterEach } = require('vitest');
const fs = require('fs');
const path = require('path');
const simpleGit = require('simple-git');
const { GitService } = require('../../src/services/git');
const { ContextRagIndexer } = require('../../src/services/indexer');

describe('Branch Cache Integration Tests', () => {
  const testProjectDir = 'test-git-project';
  const testConfig = {
    index: {
      include: ["*.md", "*.txt"],
      exclude: ["node_modules/", ".git/"]
    },
    storage: {
      path: ".context-rag/index.db"
    }
  };

  let git;
  let gitService;

  beforeEach(async () => {
    // Clean up any existing test project
    if (fs.existsSync(testProjectDir)) {
      fs.rmSync(testProjectDir, { recursive: true, force: true });
    }

    // Create test project
    fs.mkdirSync(testProjectDir, { recursive: true });
    process.chdir(testProjectDir);

    // Initialize git repository
    git = simpleGit();
    await git.init();
    await git.addConfig('user.name', 'Test User');
    await git.addConfig('user.email', 'test@example.com');

    // Create initial files
    fs.writeFileSync('README.md', '# Test Project\n\nInitial content');
    fs.writeFileSync('docs.md', '# Documentation\n\nBase documentation');

    // Initial commit
    await git.add('.');
    await git.commit('Initial commit');

    gitService = new GitService(testConfig);
  });

  afterEach(async () => {
    process.chdir('..');
    if (fs.existsSync(testProjectDir)) {
      fs.rmSync(testProjectDir, { recursive: true, force: true });
    }
  });

  it('should create branch-specific cache paths', async () => {
    const mainCachePath = await gitService.getBranchCachePath('main');
    const featureCachePath = await gitService.getBranchCachePath('feature/test');

    expect(mainCachePath).toContain('main_index.db');
    expect(featureCachePath).toContain('feature_test_index.db');
    expect(mainCachePath).not.toBe(featureCachePath);
  });

  it('should detect current branch correctly', async () => {
    const currentBranch = await gitService.getCurrentBranch();
    expect(currentBranch).toBe('main');

    // Create and switch to feature branch
    await git.checkoutLocalBranch('feature/test');
    const featureBranch = await gitService.getCurrentBranch();
    expect(featureBranch).toBe('feature/test');
  });

  it('should create separate caches for different branches', async () => {
    // Index on main branch
    const mainIndexer = new ContextRagIndexer({
      ...testConfig,
      storage: { path: await gitService.getBranchCachePath('main') }
    });
    
    await mainIndexer.indexDirectory('.');
    const mainCachePath = await gitService.getBranchCachePath('main');
    expect(fs.existsSync(mainCachePath)).toBe(true);

    // Switch to feature branch and modify files
    await git.checkoutLocalBranch('feature/test');
    fs.writeFileSync('feature.md', '# Feature\n\nNew feature documentation');
    await git.add('.');
    await git.commit('Add feature documentation');

    // Index on feature branch
    const featureIndexer = new ContextRagIndexer({
      ...testConfig,
      storage: { path: await gitService.getBranchCachePath('feature/test') }
    });
    
    await featureIndexer.indexDirectory('.');
    const featureCachePath = await gitService.getBranchCachePath('feature/test');
    expect(fs.existsSync(featureCachePath)).toBe(true);

    // Verify caches are different
    const mainCache = JSON.parse(fs.readFileSync(mainCachePath, 'utf8'));
    const featureCache = JSON.parse(fs.readFileSync(featureCachePath, 'utf8'));

    expect(mainCache.chunks.length).not.toBe(featureCache.chunks.length);
    
    const featureHasNewFile = featureCache.chunks.some(chunk => 
      chunk.file_path.includes('feature.md')
    );
    expect(featureHasNewFile).toBe(true);
  });

  it('should detect changed files between branches', async () => {
    // Create feature branch and modify files
    await git.checkoutLocalBranch('feature/changes');
    
    fs.writeFileSync('README.md', '# Test Project\n\nModified content');
    fs.writeFileSync('new-file.md', '# New File\n\nThis is new');
    
    await git.add('.');
    await git.commit('Modify existing and add new file');

    const changedFiles = await gitService.getChangedFiles('main');
    
    expect(changedFiles).toContain('README.md');
    expect(changedFiles).toContain('new-file.md');
    expect(changedFiles.length).toBe(2);
  });

  it('should merge base cache to feature branch', async () => {
    // Create and populate main branch cache
    const mainIndexer = new ContextRagIndexer({
      ...testConfig,
      storage: { path: await gitService.getBranchCachePath('main') }
    });
    await mainIndexer.indexDirectory('.');

    // Switch to feature branch
    await git.checkoutLocalBranch('feature/merge-test');
    
    // Merge cache from main
    const mergedCachePath = await gitService.mergeCacheFromBase('main');
    
    expect(mergedCachePath).toBeDefined();
    expect(fs.existsSync(mergedCachePath)).toBe(true);

    // Verify merged cache contains main branch content
    const mergedCache = JSON.parse(fs.readFileSync(mergedCachePath, 'utf8'));
    expect(mergedCache.chunks.length).toBeGreaterThan(0);
    
    const hasReadme = mergedCache.chunks.some(chunk => 
      chunk.file_path.includes('README.md')
    );
    expect(hasReadme).toBe(true);
  });

  it('should handle cache clearing', async () => {
    // Create cache for a branch
    const testBranch = 'test-branch';
    const cachePath = await gitService.getBranchCachePath(testBranch);
    
    // Create dummy cache
    await gitService.ensureCacheDirectory();
    fs.writeFileSync(cachePath, JSON.stringify({ test: 'data' }));
    expect(fs.existsSync(cachePath)).toBe(true);

    // Clear cache
    const clearedCount = await gitService.clearBranchCache(testBranch);
    expect(clearedCount).toBe(1);
    expect(fs.existsSync(cachePath)).toBe(false);
  });

  it('should list cached branches', async () => {
    // Create caches for multiple branches
    const branches = ['main', 'feature/test', 'develop'];
    
    for (const branch of branches) {
      const cachePath = await gitService.getBranchCachePath(branch);
      await gitService.ensureCacheDirectory();
      fs.writeFileSync(cachePath, JSON.stringify({ branch, data: 'test' }));
    }

    const cachedBranches = await gitService.listCachedBranches();
    
    expect(cachedBranches.length).toBe(3);
    expect(cachedBranches.map(b => b.name)).toContain('main');
    expect(cachedBranches.map(b => b.name)).toContain('feature/test');
    expect(cachedBranches.map(b => b.name)).toContain('develop');

    // Each branch should have size and modified date
    cachedBranches.forEach(branch => {
      expect(branch.size).toBeGreaterThan(0);
      expect(branch.modified).toBeInstanceOf(Date);
      expect(branch.path).toBeDefined();
    });
  });

  it('should determine when index rebuild is needed', async () => {
    // Create initial cache
    const indexer = new ContextRagIndexer({
      ...testConfig,
      storage: { path: await gitService.getBranchCachePath() }
    });
    await indexer.indexDirectory('.');

    // Initially should not need rebuild
    let shouldRebuild = await gitService.shouldRebuildIndex();
    expect(shouldRebuild).toBe(false);

    // Make changes and commit
    fs.writeFileSync('new-change.md', '# New Change\n\nThis is a new change');
    await git.add('.');
    await git.commit('Add new change');

    // Now should need rebuild
    shouldRebuild = await gitService.shouldRebuildIndex();
    expect(shouldRebuild).toBe(true);
  });

  it('should handle non-git directory gracefully', async () => {
    // Remove .git directory
    fs.rmSync('.git', { recursive: true, force: true });

    const currentBranch = await gitService.getCurrentBranch();
    expect(currentBranch).toBeNull();

    const changedFiles = await gitService.getChangedFiles();
    expect(changedFiles).toEqual([]);

    const shouldRebuild = await gitService.shouldRebuildIndex();
    expect(shouldRebuild).toBe(false);
  });
}, 60000); // 60 second timeout for git operations