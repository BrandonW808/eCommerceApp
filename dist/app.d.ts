import { Application } from 'express';
export declare class App {
    app: Application;
    constructor();
    private initializeMiddlewares;
    private initializeRoutes;
    private initializeSwagger;
    private initializeErrorHandling;
    getApp(): Application;
    listen(): void;
}
export default App;
//# sourceMappingURL=app.d.ts.map