import { defineConfig } from "vite";


export default defineConfig({

    base: "/course-gallery/",

    server: {

        port: 3000,

        open: true

    },


    build: {

        target: "esnext"

    }

});
