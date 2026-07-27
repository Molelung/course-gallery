export const CONFIG = {



    // 模型路径

    MODEL_PATH:

    "/models/film_reel.glb",




    // HDR环境

    HDR_PATH:

    "/hdr/studio.hdr",




    // 摄像机

    CAMERA: {


        FOV:45,


        NEAR:0.1,


        FAR:100,


        POSITION:{


            x:0,


            y:0.8,


            z:5


        }


    },




    // 动画

    ANIMATION:{


        ROTATION_SPEED:0.25,


        FLOAT_SPEED:1,


        FLOAT_AMOUNT:0.05


    },




    // 性能

    PERFORMANCE:{


        PIXEL_RATIO:

        Math.min(
            window.devicePixelRatio,
            2
        )


    }




};
