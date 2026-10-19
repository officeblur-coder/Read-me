// Testele rulează pe o bază separată (autoflow_test), cu rolul aplicației — deci cu RLS activ.
process.env.DATABASE_URL ??= "postgres://autoflow_app:autoflow_app_dev@localhost:5432/autoflow_test";
process.env.DATABASE_OWNER_URL_TEST ??= "postgres://autoflow_owner:autoflow_owner_dev@localhost:5432/autoflow_test";
process.env.STORAGE_DIR ??= "/tmp/autoflow-test-storage";
