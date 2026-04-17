[![Open in Codespaces](https://classroom.github.com/assets/launch-codespace-2972f46106e565e64193e422d61a12cf1da4916b45550586e14ef0a7c637dd04.svg)](https://classroom.github.com/open-in-codespaces?assignment_repo_id=23289219)
# ai-llama-cpp

We start by installing llama.cpp.  Visit the project website
at https://github.com/ggml-org/llama.cpp.git to figure out how to download.

Or you can "build" the project as below:

```
git clone https://github.com/ggml-org/llama.cpp.git
cd llama.cpp
cmake -B build
cmake --build build --config Release

# return back to top level directory
cd ..
```

The last command will take a bit to complete.

NOTE For the web devs: C++ build process is very similar to building for a frontend web application.
When you build for a react frontend web application, it's basically to bundle up 
everything into one single js file for execution.  In C++, building is compiling (similar
to bundling) all separate files into one executable command line file.

At the end, you will have many executable files in the llama.cpp/build/bin directory.
These are all command line utilities that you can use to execute LLMs on the linux command
line (terminal).

Our first executable is called llama-cli and you execute it by:

```bash
$ llama.cpp/build/bin/llama-cli
```

You'll see a bunch of error messages!

# Downloading a model

We cannot run inference with a model, so let's download a model so we can run inference! 

Unlike the python transformers library, llama.cpp does not automatically download from 
huggingface, you'll need to download the model manually.

llama.cpp only works with models in the gguf format, so you'll need to look for
GGUF models specifically:

```
wget https://huggingface.co/Qwen/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q8_0.gguf
llama.cpp/build/bin/llama-cli --model ./Qwen3-0.6B-Q8_0.gguf 
```

You can now chat with your LLM right on the command line!

# Running an inference server

Of course we don't want to run inference on the command line, we want to run it
as a server so we can connect to it with our web application.

llama.cpp provides a server that you can run to serve inference requests.

```
llama.cpp/build/bin/llama-server --model ./Qwen3-0.6B-Q8_0.gguf --reasoning-format none
```

Will run a server on port 8080.  This is a REST API that is compatible with the
OpenAI API, so you can use the OpenAI API client to connect to it.

2 endpoints are especially useful and you can insepect `test_chat.sh` and
`test_completion.sh` to see how to use them.

# Front end web application

Finally, we can connect to the server with our web application.  In a production
environment, you would run the server on a separate machine and connect to it
from your web application.  For development purposes, you can run the server
on the same machine as your web application.

The provided `frontend/chat.html` is a simple web application that has the ability to
connect to the server, but you need to apply some web deployment skills:

 1. Serve the `chat.html` file with a web server.  Let's install a production
    level web server called `nginx`:

    ```bash
    sudo apt update
    sudo apt install -y nginx
    ```

    Then we want to change the default web root directory to point to our
    frontend directory.  Modify the provided `nginx.conf` file to
    change the `root` directive to point to the `frontend` directory:

 2. Look at the `chat.html` file and you'll noticed that it calls the 
    `/v1/chat/completions` endpoint of the server, but your chat completion
    API runs on a different port!  You configure nginx so that
    the it'll send all /v1 requests to localhost:8080.

    Usually you'll need to edit the nginx configuration file 
    /etc/nginx/sites-available/default and add a location block to
    forward requests to the llama server. 

    ```nginx
    location /v1/ {
        proxy_pass http://localhost:8080/v1/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    ```

    I have already done this for you in the `nginx.conf` file, so you can
    simply copy the file to the nginx configuration directory:

    ```bash
    sudo cp nginx.conf /etc/nginx/sites-available/default
    sudo service nginx restart
    ```

3. Finally, if you are using Codespaces, you need to go to the PORTS tab and
   expose port 80 so that you can access the web application from the browser.
   If you are running this on your local machine, you can simply open a browser
   and go to http://localhost

You now have a fully functional web application that can chat with the LLM!

# Hand-in

Follow the tutorial to completion, once you have a working app, run `pytest`
to verify.  You can also run `pytest` during the middle of following
the tutorial to get part marks if you don't have time to complete 
the whole thing

Once you are ready, run the following to submit:

```
git add -A
git commit -m 'update'
git push
```
