type Metadata = Record<string, unknown> | undefined | null;

function isAdminMetadata(metadata: Metadata) {
  return metadata?.role === 'admin' || metadata?.is_admin === true;
}

export function hasAdminAccess(params: {
  appMetadata?: Metadata;
  userMetadata?: Metadata;
  adminRecordExists?: boolean;
}) {
  const { appMetadata, userMetadata, adminRecordExists } = params;

  return (
    isAdminMetadata(appMetadata) ||
    isAdminMetadata(userMetadata) ||
    adminRecordExists === true
  );
}
