package main

import (
	"encoding/base64"
	"encoding/json"
	"os"
	"path/filepath"
)

func jsonMarshalIndent(v interface{}) ([]byte, error) {
	return json.MarshalIndent(v, "", "  ")
}

func getImageAsBase64(imagePath string) string {
	if imagePath == "" {
		return ""
	}
	data, err := os.ReadFile(imagePath)
	if err != nil {
		return ""
	}
	ext := filepath.Ext(imagePath)
	if ext == ".jpg" {
		ext = ".jpeg"
	}
	if ext == "" {
		ext = ".png"
	}
	encoded := base64.StdEncoding.EncodeToString(data)
	return "data:image/" + ext[1:] + ";base64," + encoded
}
