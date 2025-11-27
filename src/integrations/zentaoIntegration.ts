/**
 * 禅道（ZenTao）API集成模块
 *
 * 提供与禅道项目管理系统的集成，包括：
 * - 需求（Story）的获取和管理
 * - Bug的获取和管理
 * - 状态更新和同步
 */

import axios, { type AxiosInstance } from 'axios';

/**
 * 禅道需求接口
 */
export interface ZentaoRequirement {
  id: number;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'closed' | 'changed';
  priority: 1 | 2 | 3 | 4;  // 1=最高, 2=高, 3=中, 4=低
  category: string;
  assignedTo: string;
  createdAt: Date;
  updatedAt: Date;
  product: string;
  productId: number;
  project?: string;
  projectId?: number;
  spec?: string;          // 需求描述详情
  verify?: string;        // 验收标准
  stage: string;          // 阶段
  estimate?: number;      // 预计工时
}

/**
 * 禅道Bug接口
 */
export interface ZentaoBug {
  id: number;
  title: string;
  description: string;
  steps: string;          // 重现步骤
  severity: 1 | 2 | 3 | 4; // 1=致命, 2=严重, 3=一般, 4=轻微
  pri: 1 | 2 | 3 | 4;     // 优先级
  status: 'active' | 'resolved' | 'closed';
  assignedTo: string;
  module: string;
  moduleId: number;
  product: string;
  productId: number;
  project?: string;
  projectId?: number;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  type: 'codeerror' | 'interface' | 'config' | 'install' | 'security' | 'performance' | 'standard' | 'automation' | 'designdefect' | 'others';
  os: string;             // 操作系统
  browser: string;        // 浏览器
  files?: string[];       // 附件文件ID列表
  openedBy?: string;      // 创建者
  openedDate?: string;    // 创建时间
  resolvedDate?: string;  // 解决时间
}

/**
 * 禅道配置接口
 */
export interface ZentaoConfig {
  apiUrl: string;         // 禅道API地址，如：http://zentao.example.com
  account: string;        // 账号
  password: string;       // 密码
  productIds?: number[];  // 监听的产品ID列表
  projectIds?: number[];  // 监听的项目ID列表
}

/**
 * 禅道API响应接口
 */
interface ZentaoAPIResponse<T = any> {
  status: 'success' | 'fail';
  data?: T;
  message?: string;
  md5?: string;
}

/**
 * 禅道集成类
 */
export class ZentaoIntegration {
  private client: AxiosInstance;
  private config: ZentaoConfig;
  private sessionID?: string;

  constructor(config: ZentaoConfig) {
    this.config = config;

    // 创建axios实例
    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
      proxy: false, // 禁用代理，避免内网地址走代理导致502错误
    });

    // 添加响应拦截器处理错误
    this.client.interceptors.response.use(
      response => response,
      error => {
        if (error.response) {
          throw new Error(`禅道API错误: ${error.response.status} - ${error.response.data?.message || error.message}`);
        } else if (error.request) {
          throw new Error(`禅道API请求失败: 无响应 - ${error.message}`);
        } else {
          throw new Error(`禅道API错误: ${error.message}`);
        }
      }
    );
  }

  /**
   * 登录并获取session
   */
  private async login(): Promise<void> {
    try {
      const response = await this.client.post<any>('/api.php/v1/tokens', {
        account: this.config.account,
        password: this.config.password,
      });

      // 禅道 API 直接返回 { "token": "..." } 格式
      if (response.data?.token) {
        this.sessionID = response.data.token;
        // 设置后续请求的token header
        this.client.defaults.headers.common['Token'] = this.sessionID;
      } else {
        throw new Error(`禅道登录失败: 无法获取 token (响应数据: ${JSON.stringify(response.data)})`);
      }
    } catch (error: any) {
      throw new Error(`禅道登录失败: ${error.message}`);
    }
  }

  /**
   * 确保已登录
   */
  private async ensureLoggedIn(): Promise<void> {
    if (!this.sessionID) {
      await this.login();
    }
  }

  /**
   * 获取需求列表
   */
  async fetchRequirements(filters?: {
    status?: string[];       // 状态过滤：draft, active, closed, changed
    priority?: number[];     // 优先级过滤：1-4
    startDate?: Date;        // 开始日期
    endDate?: Date;          // 结束日期
    productId?: number;      // 产品ID
  }): Promise<ZentaoRequirement[]> {
    await this.ensureLoggedIn();

    const requirements: ZentaoRequirement[] = [];
    const productIds = filters?.productId
      ? [filters.productId]
      : (this.config.productIds || []);

    // 如果没有指定产品ID，获取所有产品
    if (productIds.length === 0) {
      const products = await this.fetchProducts();
      productIds.push(...products.map((p: any) => p.id));
    }

    // 遍历所有产品获取需求
    for (const productId of productIds) {
      try {
        const response = await this.client.get<any>(
          `/api.php/v1/products/${productId}/stories`,
          {
            params: {
              status: filters?.status?.join(','),
              limit: 1000,  // 一次获取最多1000条
            }
          }
        );

        // 尝试多种响应格式
        let stories: any[] = [];
        if (response.data?.stories) {
          stories = Array.isArray(response.data.stories)
            ? response.data.stories
            : Object.values(response.data.stories);
        } else if (response.data?.data?.stories) {
          stories = Array.isArray(response.data.data.stories)
            ? response.data.data.stories
            : Object.values(response.data.data.stories);
        } else if (Array.isArray(response.data)) {
          stories = response.data;
        }

        if (stories.length > 0) {

          for (const story of stories) {
            // 应用过滤条件
            if (filters?.priority && !filters.priority.includes(story.pri)) {
              continue;
            }

            if (filters?.startDate && new Date(story.openedDate) < filters.startDate) {
              continue;
            }

            if (filters?.endDate && new Date(story.openedDate) > filters.endDate) {
              continue;
            }

            requirements.push({
              id: story.id,
              title: story.title,
              description: story.spec || story.title,
              status: story.status,
              priority: story.pri,
              category: story.category || '',
              assignedTo: story.assignedTo || '',
              createdAt: new Date(story.openedDate),
              updatedAt: new Date(story.lastEditedDate || story.openedDate),
              product: story.product || '',
              productId: productId,
              spec: story.spec,
              verify: story.verify,
              stage: story.stage || '',
              estimate: story.estimate,
            });
          }
        }
      } catch (error: any) {
        console.error(`获取产品 ${productId} 的需求失败:`, error.message);
      }
    }

    return requirements;
  }

  /**
   * 获取Bug列表
   */
  async fetchBugs(filters?: {
    status?: string[];       // 状态过滤：active, resolved, closed
    severity?: number[];     // 严重程度过滤：1-4
    module?: string;         // 模块
    productId?: number;      // 产品ID
    startDate?: Date;        // 开始日期
    endDate?: Date;          // 结束日期
  }): Promise<ZentaoBug[]> {
    await this.ensureLoggedIn();

    const bugs: ZentaoBug[] = [];
    const productIds = filters?.productId
      ? [filters.productId]
      : (this.config.productIds || []);

    // 如果没有指定产品ID，获取所有产品
    if (productIds.length === 0) {
      const products = await this.fetchProducts();
      productIds.push(...products.map((p: any) => p.id));
    }

    // 遍历所有产品获取Bug
    for (const productId of productIds) {
      try {
        const response = await this.client.get<any>(
          `/api.php/v1/products/${productId}/bugs`,
          {
            params: {
              status: filters?.status?.join(','),
              limit: 1000,
            }
          }
        );

        // 尝试多种响应格式
        let bugsList: any[] = [];
        if (response.data?.bugs) {
          bugsList = Array.isArray(response.data.bugs)
            ? response.data.bugs
            : Object.values(response.data.bugs);
        } else if (response.data?.data?.bugs) {
          bugsList = Array.isArray(response.data.data.bugs)
            ? response.data.data.bugs
            : Object.values(response.data.data.bugs);
        } else if (Array.isArray(response.data)) {
          bugsList = response.data;
        }

        if (bugsList.length > 0) {

          for (const bug of bugsList) {
            // 应用过滤条件
            if (filters?.severity && !filters.severity.includes(bug.severity)) {
              continue;
            }

            if (filters?.module && bug.module !== filters.module) {
              continue;
            }

            if (filters?.startDate && new Date(bug.openedDate) < filters.startDate) {
              continue;
            }

            if (filters?.endDate && new Date(bug.openedDate) > filters.endDate) {
              continue;
            }

            bugs.push({
              id: bug.id,
              title: bug.title,
              description: bug.steps || '',
              steps: bug.steps || '',
              severity: bug.severity,
              pri: bug.pri,
              status: bug.status,
              assignedTo: bug.assignedTo || '',
              module: bug.moduleName || '',
              moduleId: bug.module || 0,
              product: bug.product || '',
              productId: productId,
              createdAt: new Date(bug.openedDate),
              updatedAt: new Date(bug.lastEditedDate || bug.openedDate),
              resolvedAt: bug.resolvedDate ? new Date(bug.resolvedDate) : undefined,
              type: bug.type || 'others',
              os: bug.os || '',
              browser: bug.browser || '',
              files: bug.files || [],
              openedBy: bug.openedBy || '',
              openedDate: bug.openedDate || '',
              resolvedDate: bug.resolvedDate || '',
            });
          }
        }
      } catch (error: any) {
        console.error(`获取产品 ${productId} 的Bug失败:`, error.message);
      }
    }

    return bugs;
  }

  /**
   * 获取需求详情
   */
  async getRequirementDetail(id: number): Promise<ZentaoRequirement> {
    await this.ensureLoggedIn();

    try {
      const response = await this.client.get<ZentaoAPIResponse>(
        `/api.php/v1/stories/${id}`
      );

      if (response.data.status === 'success' && response.data.data) {
        const story = response.data.data;
        return {
          id: story.id,
          title: story.title,
          description: story.spec || story.title,
          status: story.status,
          priority: story.pri,
          category: story.category || '',
          assignedTo: story.assignedTo || '',
          createdAt: new Date(story.openedDate),
          updatedAt: new Date(story.lastEditedDate || story.openedDate),
          product: story.product || '',
          productId: story.product,
          project: story.project,
          projectId: story.project,
          spec: story.spec,
          verify: story.verify,
          stage: story.stage || '',
          estimate: story.estimate,
        };
      } else {
        throw new Error(`获取需求详情失败: ${response.data.message || '未知错误'}`);
      }
    } catch (error: any) {
      throw new Error(`获取需求 ${id} 详情失败: ${error.message}`);
    }
  }

  /**
   * 获取Bug详情
   */
  async getBugDetail(id: number): Promise<ZentaoBug> {
    await this.ensureLoggedIn();

    try {
      const response = await this.client.get<ZentaoAPIResponse>(
        `/api.php/v1/bugs/${id}`
      );

      if (response.data.status === 'success' && response.data.data) {
        const bug = response.data.data;
        return {
          id: bug.id,
          title: bug.title,
          description: bug.steps || '',
          steps: bug.steps || '',
          severity: bug.severity,
          pri: bug.pri,
          status: bug.status,
          assignedTo: bug.assignedTo || '',
          module: bug.moduleName || '',
          moduleId: bug.module || 0,
          product: bug.product || '',
          productId: bug.product,
          project: bug.project,
          projectId: bug.project,
          createdAt: new Date(bug.openedDate),
          updatedAt: new Date(bug.lastEditedDate || bug.openedDate),
          resolvedAt: bug.resolvedDate ? new Date(bug.resolvedDate) : undefined,
          type: bug.type || 'others',
          os: bug.os || '',
          browser: bug.browser || '',
        };
      } else {
        throw new Error(`获取Bug详情失败: ${response.data.message || '未知错误'}`);
      }
    } catch (error: any) {
      throw new Error(`获取Bug ${id} 详情失败: ${error.message}`);
    }
  }

  /**
   * 更新需求状态
   */
  async updateRequirementStatus(id: number, status: 'draft' | 'active' | 'closed' | 'changed', comment?: string): Promise<void> {
    await this.ensureLoggedIn();

    try {
      const data: any = { status };
      if (comment) {
        data.comment = comment;
      }

      const response = await this.client.put<ZentaoAPIResponse>(
        `/api.php/v1/stories/${id}`,
        data
      );

      if (response.data.status !== 'success') {
        throw new Error(`更新需求状态失败: ${response.data.message || '未知错误'}`);
      }
    } catch (error: any) {
      throw new Error(`更新需求 ${id} 状态失败: ${error.message}`);
    }
  }

  /**
   * 更新Bug状态
   */
  async updateBugStatus(id: number, status: 'active' | 'resolved' | 'closed', comment?: string): Promise<void> {
    await this.ensureLoggedIn();

    try {
      const data: any = { status };
      if (comment) {
        data.comment = comment;
      }

      const response = await this.client.put<ZentaoAPIResponse>(
        `/api.php/v1/bugs/${id}`,
        data
      );

      if (response.data.status !== 'success') {
        throw new Error(`更新Bug状态失败: ${response.data.message || '未知错误'}`);
      }
    } catch (error: any) {
      throw new Error(`更新Bug ${id} 状态失败: ${error.message}`);
    }
  }

  /**
   * 获取产品列表
   */
  async fetchProducts(): Promise<Array<{ id: number; name: string; status?: string }>> {
    await this.ensureLoggedIn();

    try {
      const response = await this.client.get<any>(
        '/api.php/v1/products',
        {
          params: {
            limit: 1000,
          }
        }
      );

      // 尝试多种响应格式
      let products: any[] = [];
      if (response.data?.products) {
        products = Array.isArray(response.data.products)
          ? response.data.products
          : Object.values(response.data.products);
      } else if (response.data?.data?.products) {
        products = Array.isArray(response.data.data.products)
          ? response.data.data.products
          : Object.values(response.data.data.products);
      } else if (Array.isArray(response.data)) {
        products = response.data;
      }

      return products.map((p: any) => ({
        id: p.id,
        name: p.name,
        status: p.status,
      }));
    } catch (error: any) {
      console.error('获取产品列表失败:', error.message);
      return [];
    }
  }

  /**
   * 获取项目列表
   */
  async fetchProjects(): Promise<Array<{ id: number; name: string; status?: string }>> {
    await this.ensureLoggedIn();

    try {
      const response = await this.client.get<any>(
        '/api.php/v1/projects',
        {
          params: {
            limit: 1000,
          }
        }
      );

      // 尝试多种响应格式
      let projects: any[] = [];
      if (response.data?.projects) {
        projects = Array.isArray(response.data.projects)
          ? response.data.projects
          : Object.values(response.data.projects);
      } else if (response.data?.data?.projects) {
        projects = Array.isArray(response.data.data.projects)
          ? response.data.data.projects
          : Object.values(response.data.data.projects);
      } else if (Array.isArray(response.data)) {
        projects = response.data;
      }

      return projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        status: p.status,
      }));
    } catch (error: any) {
      console.error('获取项目列表失败:', error.message);
      return [];
    }
  }

  /**
   * 获取Bug的附件列表
   */
  async getBugFiles(bugId: number): Promise<Array<{ id: number; title: string; extension: string; size: number; pathname: string; downloadUrl?: string }>> {
    await this.ensureLoggedIn();

    try {
      // 先获取Bug详情，从中提取附件信息
      const response = await this.client.get<any>(
        `/api.php/v1/bugs/${bugId}`
      );

      let bugData: any = null;
      if (response.data?.bug) {
        bugData = response.data.bug;
      } else if (response.data?.data) {
        bugData = response.data.data;
      } else if (response.data?.id) {
        bugData = response.data;
      }

      if (!bugData) {
        return [];
      }

      // 从Bug数据中提取附件信息
      let files: any[] = [];
      if (bugData.files) {
        files = Array.isArray(bugData.files)
          ? bugData.files
          : Object.values(bugData.files);
      }

      return files.map((f: any) => ({
        id: f.id,
        title: f.title || f.name || 'unknown',
        extension: f.extension || '',
        size: f.size || 0,
        pathname: f.pathname || f.webPath || '',
        downloadUrl: f.webPath || f.pathname || '',
      }));
    } catch (error: any) {
      // 如果获取详情失败，尝试直接获取附件列表
      try {
        const filesResponse = await this.client.get<any>(
          `/api.php/v1/bugs/${bugId}/files`
        );

        let files: any[] = [];
        if (filesResponse.data?.files) {
          files = Array.isArray(filesResponse.data.files)
            ? filesResponse.data.files
            : Object.values(filesResponse.data.files);
        } else if (filesResponse.data?.data?.files) {
          files = Array.isArray(filesResponse.data.data.files)
            ? filesResponse.data.data.files
            : Object.values(filesResponse.data.data.files);
        } else if (Array.isArray(filesResponse.data)) {
          files = filesResponse.data;
        }

        return files.map((f: any) => ({
          id: f.id,
          title: f.title || f.name || 'unknown',
          extension: f.extension || '',
          size: f.size || 0,
          pathname: f.pathname || f.webPath || '',
          downloadUrl: f.webPath || f.pathname || '',
        }));
      } catch (innerError: any) {
        console.error(`获取Bug ${bugId} 的附件失败:`, innerError.message);
        return [];
      }
    }
  }

  /**
   * 下载文件
   */
  async downloadFile(fileId: number, outputPath: string, pathname?: string): Promise<boolean> {
    await this.ensureLoggedIn();

    const fs = await import('fs');
    const path = await import('path');

    try {
      // 尝试多种下载方式
      let response;
      let downloadSuccess = false;

      // 方式1: 使用 /api.php/v1/files/{fileId}
      try {
        response = await this.client.get(
          `/api.php/v1/files/${fileId}`,
          {
            responseType: 'arraybuffer',
          }
        );
        downloadSuccess = true;
      } catch (e1) {
        // 方式2: 使用 pathname 直接下载
        if (pathname) {
          try {
            // 移除 API URL，使用完整的文件路径
            const fileUrl = pathname.startsWith('http')
              ? pathname
              : `${this.config.apiUrl}${pathname.startsWith('/') ? '' : '/'}${pathname}`;

            response = await this.client.get(
              fileUrl,
              {
                responseType: 'arraybuffer',
                baseURL: undefined, // 使用完整URL时不使用baseURL
              }
            );
            downloadSuccess = true;
          } catch (e2) {
            // 方式3: 尝试使用禅道的文件下载路径
            try {
              response = await this.client.get(
                `/file-read-${fileId}`,
                {
                  responseType: 'arraybuffer',
                }
              );
              downloadSuccess = true;
            } catch (e3) {
              throw new Error(`所有下载方式都失败: ${e1.message}, ${e2.message}, ${e3.message}`);
            }
          }
        } else {
          throw e1;
        }
      }

      if (downloadSuccess && response) {
        // 确保目录存在
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // 写入文件
        fs.writeFileSync(outputPath, Buffer.from(response.data));
        return true;
      }

      return false;
    } catch (error: any) {
      console.error(`下载文件 ${fileId} 失败:`, error.message);
      return false;
    }
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.login();
      return true;
    } catch (error: any) {
      console.error('禅道连接测试失败:', error.message);
      return false;
    }
  }
}
