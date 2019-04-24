# Simple image hoster

## Usage:

```bash
npm start
```

## Envs:

`DOMAIN_NAME` default: `localhost`

`HOST_PORT` default: `3234`

`PROTOCOL` default: `http`

`STORAGE_PATH` default: `./files`

`MONGO_CONNECT` default: `mongodb://localhost/imagehoster`

## Http/s API

### Uploading:

```
POST http://localhost:3234/upload
Content-Type: multipart/form-data
```

In request body must be 1 parameter with name "file".

Example of success response:

```
{
  "url": "http://localhost:3234/images/3SSU9PrP8CthgEWobCfKKetBL8q8.png"
}
```

### Fetching:

#### Simple (without resizing):

```
GET http://localhost:3234/images/{FILE_ID}.{EXTENSION}
```

http://localhost:3234/images/3SSU9PrP8CthgEWobCfKKetBL8q8.png

#### With resizing:

```
GET http://localhost:3234/images/{WIDTH}x{HEIGHT}/{FILE_ID}.{EXTENSION}
```

http://localhost:3234/images/100x100/3SSU9PrP8CthgEWobCfKKetBL8q8.png

### Proxy:

Image will be downloaded first time and cached

#### Simple (without resizing):

```
GET http://localhost:3234/proxy/{IMAGE_URL}
```

http://localhost:3234/proxy/https://i.gifer.com/1HOf.gif

#### With resizing:

```
GET http://localhost:3234/proxy/{WIDTH}x{HEIGHT}/{IMAGE_URL}
```

http://localhost:3234/proxy/859x356/https://i.gifer.com/1HOf.gif

#### You can proxy images that have been uploaded to this hosting too:

Link http://localhost:3234/proxy/100x100/http://localhost:3234/images/3SSU9PrP8CthgEWobCfKKetBL8q8.png will have same effect as: http://localhost:3234/images/100x100/3SSU9PrP8CthgEWobCfKKetBL8q8.png

But it good idea to reformat that links in short form, otherwise we can take urls like:

http://localhost:3234/proxy/100x100/http://localhost:3234/proxy/320x320/http://localhost:3234/proxy/http://localhost:3234/images/3SSU9PrP8CthgEWobCfKKetBL8q8.png
