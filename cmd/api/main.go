package main

import (
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/turbo-uid/hots/globals"
	"github.com/turbo-uid/hots/routers"
	"github.com/turbo-uid/hots/startups"

	"github.com/gin-gonic/gin"
	"github.com/patrickmn/go-cache"
)

func main() {

	globals.GoLogger = startups.StartupLog()

	gin.SetMode(gin.ReleaseMode)

	globals.GoCache = cache.New(5*time.Minute, 10*time.Minute)

	routersInit := routers.InitRouter()
	readTimeout := 10 * time.Second
	writeTimeout := 10 * time.Second

	// Use PORT environment variable if available (for Railway)
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}
	endPoint := fmt.Sprintf("0.0.0.0:%s", port)
	maxHeaderBytes := 1 << 20 // 1 MB

	server := &http.Server{
		Addr:           endPoint,
		Handler:        routersInit,
		ReadTimeout:    readTimeout,
		WriteTimeout:   writeTimeout,
		MaxHeaderBytes: maxHeaderBytes,
	}

	globals.GoLogger.Infof("start http server listening %s", endPoint)
	fmt.Printf("start http server listening %s\r\n", endPoint)

	server.ListenAndServe()
}
