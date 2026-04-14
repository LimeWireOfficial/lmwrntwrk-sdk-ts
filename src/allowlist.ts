const ACTIONS = new Set<string>([
  's3:AbortMultipartUpload',
  's3:CompleteMultipartUpload',
  's3:CopyObject',
  's3:CreateMultipartUpload',
  's3:DeleteBucketTagging',
  's3:DeleteObject',
  's3:DeleteObjects',
  's3:DeleteObjectTagging',
  's3:GetBucketLocation',
  's3:GetBucketTagging',
  's3:GetBucketVersioning',
  's3:GetObject',
  's3:GetObjectAttributes',
  's3:GetObjectLegalHold',
  's3:GetObjectLockConfiguration',
  's3:GetObjectRetention',
  's3:GetObjectTagging',
  's3:HeadBucket',
  's3:HeadObject',
  's3:ListMultipartUploads',
  's3:ListObjects',
  's3:ListObjectsV2',
  's3:ListParts',
  's3:PutBucketTagging',
  's3:PutObject',
  's3:PutObjectTagging',
  's3:UploadPart',
  's3:UploadPartCopy',
]);

function toArray(v: string | string[] | undefined): string[] {
  if (v === undefined) {
    return [];
  }
  return Array.isArray(v) ? v : [v];
}

function hasQuery(query: Record<string, string | string[] | undefined>, key: string): boolean {
  return toArray(query[key]).length > 0;
}

function getQuery(query: Record<string, string | string[] | undefined>, key: string): string {
  return toArray(query[key])[0] ?? '';
}

export function isActionAllowed(action: string): boolean {
  return ACTIONS.has(action);
}

const VALIDATOR_ACTIONS = new Set<string>([
  's3:AbortMultipartUpload',
  's3:CompleteMultipartUpload',
  's3:CopyObject',
  's3:CreateMultipartUpload',
  's3:DeleteObject',
  's3:DeleteObjects',
  's3:DeleteObjectTagging',
  's3:GetObject',
  's3:PutBucketTagging',
  's3:PutObject',
  's3:PutObjectTagging',
  's3:UploadPart',
  's3:UploadPartCopy',
]);

export function isValidatorActionAllowed(action: string): boolean {
  return VALIDATOR_ACTIONS.has(action);
}

export function getS3ActionFromRequest(request: {
  method: string;
  path: string;
  query?: Record<string, string | string[] | undefined>;
  headers?: Record<string, string | undefined>;
}): string {
  const method = request.method;
  const query = request.query ?? {};
  const path = request.path || '/';

  const segments = path
    .replace(/^\/+/, '')
    .split('/')
    .filter((s) => s.length > 0);

  const isBucketPath = segments.length === 1;
  const isObjectPath = segments.length >= 2;

  if (isBucketPath && hasQuery(query, 'uploads') && method === 'GET') return 's3:ListMultipartUploads';
  if (isObjectPath && hasQuery(query, 'uploadId') && method === 'GET') return 's3:ListParts';
  if (isObjectPath && hasQuery(query, 'uploadId') && method === 'DELETE') return 's3:AbortMultipartUpload';
  if (isObjectPath && hasQuery(query, 'uploadId') && method === 'POST') return 's3:CompleteMultipartUpload';
  if (isObjectPath && hasQuery(query, 'partNumber') && hasQuery(query, 'uploadId') && method === 'PUT') {
    if ((request.headers?.['x-amz-copy-source'] ?? '') !== '') return 's3:UploadPartCopy';
    return 's3:UploadPart';
  }

  if (isBucketPath && hasQuery(query, 'tagging')) {
    if (method === 'GET') return 's3:GetBucketTagging';
    if (method === 'DELETE') return 's3:DeleteBucketTagging';
    if (method === 'PUT') return 's3:PutBucketTagging';
  }

  if (isObjectPath && hasQuery(query, 'tagging')) {
    if (method === 'GET') return 's3:GetObjectTagging';
    if (method === 'DELETE') return 's3:DeleteObjectTagging';
    if (method === 'PUT') return 's3:PutObjectTagging';
  }

  if (isObjectPath && hasQuery(query, 'legal-hold')) {
    if (method === 'GET') return 's3:GetObjectLegalHold';
    if (method === 'PUT') return 's3:PutObjectLegalHold';
  }

  if (isObjectPath && hasQuery(query, 'retention')) {
    if (method === 'GET') return 's3:GetObjectRetention';
    if (method === 'PUT') return 's3:PutObjectRetention';
  }

  if (isBucketPath && hasQuery(query, 'object-lock')) {
    if (method === 'GET') return 's3:GetObjectLockConfiguration';
    if (method === 'PUT') return 's3:PutObjectLockConfiguration';
  }

  if (isBucketPath && hasQuery(query, 'versioning') && method === 'GET') return 's3:GetBucketVersioning';
  if (isBucketPath && hasQuery(query, 'location') && method === 'GET') return 's3:GetBucketLocation';
  if (isBucketPath && hasQuery(query, 'session') && method === 'GET') return 's3:CreateSession';
  if (isBucketPath && hasQuery(query, 'delete') && method === 'POST') return 's3:DeleteObjects';
  if (isBucketPath && method === 'HEAD') return 's3:HeadBucket';

  if (isBucketPath && method === 'GET') {
    if (getQuery(query, 'list-type') === '2') return 's3:ListObjectsV2';
    if (
      hasQuery(query, 'delimiter') ||
      hasQuery(query, 'encoding-type') ||
      hasQuery(query, 'marker') ||
      hasQuery(query, 'max-keys') ||
      hasQuery(query, 'prefix')
    ) {
      return 's3:ListObjects';
    }
  }

  if (isObjectPath) {
    if (method === 'GET') {
      if (hasQuery(query, 'attributes')) return 's3:GetObjectAttributes';
      return 's3:GetObject';
    }
    if (method === 'PUT') {
      if ((request.headers?.['x-amz-copy-source'] ?? '') !== '') return 's3:CopyObject';
      return 's3:PutObject';
    }
    if (method === 'POST') {
      if (hasQuery(query, 'uploadId')) return 's3:CompleteMultipartUpload';
      if (hasQuery(query, 'uploads')) return 's3:CreateMultipartUpload';
    }
    if (method === 'DELETE') return 's3:DeleteObject';
    if (method === 'HEAD') return 's3:HeadObject';
  }

  return '';
}
