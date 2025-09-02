const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { Signer } = require('@volcengine/vcloud-core');
const axios = require('axios');

const baseDir = path.resolve('/', 'tmp');

const VOLCENGINE_API_HOST = 'open.volcengineapi.com';
const DEFAULT_SERVICE_NAME = 'vefaas';
const DEFAULT_VERSION = '2021-03-03';
const DEFAULT_REGION = 'cn-beijing';

const getPackagejson = root => {
  const file = path.resolve(root, 'package.json')
  if (fs.existsSync(file)) {
    return fs.readFileSync(file)?.toString();
  }
  return ''
}

const getPackageManager = root => {
  if (fs.existsSync(path.resolve(root, 'package-lock.json'))) {
    return 'npm';
  }
  if (fs.existsSync(path.resolve(root, 'yarn.lock'))) {
    return 'yarn';
  }
  if (fs.existsSync(path.resolve(root, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  return 'npm';
};

class CustomClient {
  constructor(options) {
    this.instance = this.axiosRequest(options);
  }

  axiosRequest(options) {
    const { region, accessKey, secretKey, host, headers, serviceName, sessionToken, version } = options;
    const baseURL = 'http://' + host

    const instance = axios.create({
      baseURL: baseURL,
      method: 'POST',
      params: { Version: version },
      headers,
    });

    instance.interceptors.request.use(config => {
      const requestInfo = {
        region: region,
        method: config.method || 'POST',
        pathname: '/',
        params: config.params || {},
        body: config.data,
        headers: config.headers,
      };

      const signer = new Signer(requestInfo, serviceName);

      signer.addAuthorization(
        {
          accessKey,
          secretKey,
          sessionToken
        },
        new Date()
      );

      return config;
    });

    instance.interceptors.response.use(
      config => {
        return config.data;
      },
      err => {
        console.warn('Request Error: ', err?.response?.data?.ResponseMetadata?.Error?.Message || err?.response?.data);
        return Promise.reject(
          err?.response?.data?.ResponseMetadata?.Error?.Code ||
            err?.response?.data?.ResponseMetadata?.Error?.Message ||
            err?.response?.data
        );
      }
    );

    return instance;
  }

  async GetRevision(params) {
    return await this.instance.request({
      data: params,
      params: { Action: 'GetRevision' },
    });
  }

  async GetCodeUploadAddress(params) {
    return await this.instance.request({
      data: params,
      params: { Action: 'GetCodeUploadAddress' },
    });
  }

  async CodeUploadCallback(params) {
    return await this.instance.request({
      data: params,
      params: { Action: 'CodeUploadCallback' },
    });
  }
}

async function handler() {
  console.log('[faas-build] Build function start to execute...');

  // Define the file path where the environment variables are stored
  const envFilePath = '/workspace/credentials';

  // Read the file and parse the environment variables
  const envs = {};
  fs.readFileSync(envFilePath, 'utf8')
    .split('\n')
    .forEach((line) => {
      const trimmedLine = line.trim();
      // Ignore empty lines and comments
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, value] = trimmedLine.split('=', 2); // Split by '='
        envs[key] = value;
      }
    });

  let assumeRoleAK = envs['ACCESS_KEY_ID'];
  let assumeRoleSK = envs['ACCESS_KEY_SECRET'];
  let assumeRoleSessionToken = envs['SESSION_TOKEN'];
  // Backward compatible
  if (!assumeRoleAK || !assumeRoleSK || !assumeRoleSessionToken) {
    console.log("No encrypted envs found. Falling back to unencrypted envs.");
    assumeRoleAK = process.env.ACCESS_KEY_ID;
    assumeRoleSK = process.env.ACCESS_KEY_SECRET;
    assumeRoleSessionToken = process.env.SESSION_TOKEN;
  }
  const function_id = 'zwmaimy7';
  const region = process.env.REGION || DEFAULT_REGION;
  const serviceName = process.env.SERVICE_NAME || DEFAULT_SERVICE_NAME;
  const vefaasOpenApiVersion = process.env.VEFAAS_OPENAPI_VERSION || DEFAULT_VERSION;
  const host = process.env.VOLCENGINE_API_HOST || VOLCENGINE_API_HOST;

  const options = {
    accessKey: assumeRoleAK,
    secretKey: assumeRoleSK,
    serviceName: serviceName,
    version: vefaasOpenApiVersion,
    region,
    host,
    sessionToken: assumeRoleSessionToken
  };

  const customClient = new CustomClient(options);

  let isFinished = false;
  let errorMessage;

  /**
   * check whether function_id is passed
   */
  if (!function_id) {
    return {
      errorMessage: 'FunctionID param is required',
      statusCode: 400
    }
  }

  /**
   * check whether current function is node runtime
   */
  console.log('[faas-build] GetRevision start');
  const response = await customClient.GetRevision({
    FunctionId: function_id,
    RevisionNumber: 0,
  });

  if (!response) {
    return {
      errorMessage: 'Get revision failed',
      statusCode: 400
    }
  }

  console.log('[faas-build] GetRevision ended');

  if (!response.Result.Runtime.toLowerCase().includes('node')) {
    return {
      errorMessage: 'Only node runtime can use this api',
      statusCode: 400
    }
  }

  const sourceLocation = response.Result.SourceLocation
  console.log("[faas-build] Source location presigned url: ", sourceLocation)

  const zipName = sourceLocation?.split('?')?.[0]?.split('/').pop();
  const hash = zipName.split('.zip')[0];

  const cwd = path.resolve(baseDir, hash);
  const zipPath = path.resolve(baseDir, zipName);
  fs.mkdirSync(cwd, { recursive: true });

   // download
  console.log('[faas-build] Downloading function code...');
  const curl = spawnSync('curl', ['-o', zipPath, sourceLocation], {
    cwd: baseDir,
  });


  console.log('[faas-build] Donwload info: ', curl.stderr.toString())

  if (curl.status !== 0) {
    return {
      errorMessage: 'Download function code failed',
      statusCode: 400
    }
  }

  console.log('[faas-build] Downloading function code finished');

  // unzip

  console.log('[faas-build] Unzipping function code...')

  const unzip = spawnSync('unzip', ['-a', zipName, '-d', cwd], { cwd: baseDir });

  console.log('[faas-build] Unzip info: ', unzip.stderr.toString())

  if (unzip.status !== 0) {
    return {
      errorMessage: 'Unzip failed',
      statusCode: 400
    }
  }

  console.log('[faas-build] Unzipping function code finished');

  // install

  const packageContent = getPackagejson(cwd)

    if (!packageContent) {
      return {
        errorMessage: 'Package.json not found in user code dir',
        statusCode: 400
      }
    } else {
      console.log('[faas-build] Content of package.json: ', packageContent)
    }

    // delete previous node_modules
    const remove = spawnSync('rm', ['-rf', 'node_modules'], { cwd })


    const packageManager = getPackageManager(cwd);
    console.log('[faas-build] The packageManager is: ', packageManager)

    console.log('[faas-build] Installing user dependencies listed in user-defined package.json');

    const install = spawnSync(packageManager, ['install', '--verbose'], { cwd, stdout: 'pipe'});

    console.log('[faas-build] Install info: ', install.stderr.toString())

    if (install.status !== 0) {
      return {
        errorMessage: 'Install failed',
        statusCode: 400
      }
    }

    console.log('[faas-build] Installing dependencies finished');

    console.log('[faas-build] Zipping installed code...');

    const zip = spawnSync('zip', ['-ry', '../' + zipName, '.'], { cwd });

    console.log('[faas-build] Zip info: ', zip.stderr.toString())

    if (zip.status !== 0) {
      return {
        errorMessage: 'Zipped failed',
        statusCode: 400
      }
    }

    console.log('[faas-build] Zipping installed code finished');

    console.log('[faas-build] Updating client code...');

    try {
      // 读取文件到Buffer中
      const buffer = fs.readFileSync(zipPath);

      const zippedSizeInMB = (buffer.length / 1024/ 1024).toFixed(2)

      console.log('[faas-build] Size of dependencies installed zipped: ', zippedSizeInMB, 'MB')

      const res = await customClient.GetCodeUploadAddress({
        ContentLength: buffer.length,
        FunctionId: function_id,
      });

      const uploadAddress = res.Result.UploadAddress

      console.log("[faas-build] Upload address:", uploadAddress)

      await axios.put(res.Result.UploadAddress, buffer);

      await customClient.CodeUploadCallback({
        FunctionId: function_id,
      });
    } catch (err) {
      return {
        errorMessage: 'Update client code failed, please retry...',
        statusCode: 400
      }
    }

    console.log('[faas-build] Updating client code finished');
    console.log('[faas-build] Build function %s finished', function_id)
    return {
      statusCode: 200,
      message: 'Build successfully'
    }
}

(async () => {
  try {
    const res = await handler();
    if (res.statusCode === 200) {
      process.exit(0);
    } else {
      console.log('[faas-build] Building function error: ', res);
      process.exit(1);
    }
  } catch (err) {
    console.log('[faas-build] An error occured: ', err);
    process.exit(1);
  }
})();
