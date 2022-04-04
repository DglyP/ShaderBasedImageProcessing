const knnVertexShader = `
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

precision highp float;

in vec3 position;

void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0 );
}
`

const knnFragmentShader = `
precision highp float;

uniform sampler2D image;
uniform int kernelSize;
uniform vec2 resolution;
uniform float colorScaleR;
uniform float colorScaleG;
uniform float colorScaleB;
    
    
out vec4 out_FragColor;

#define MAX_ARRAY_SIZE 10

//Insertion Sort from https://www.geeksforgeeks.org/insertion-sort/
void insertionSort(inout vec4 arr[MAX_ARRAY_SIZE], int n) {
vec4 key;
int i, j;
for (i = 1; i < n; i++) {
    key = arr[i];
    j = i - 1;

    /* Move elements of arr[0..i-1], that are
    greater than key, to one position ahead
    of their current position */
    while (j >= 0 && length(arr[j]) > length(key)) {
    arr[j + 1] = arr[j];
    j = j - 1;
    }
    arr[j + 1] = key;
}
}

void main(void) {
ivec2 P = ivec2(int(gl_FragCoord.x), int(gl_FragCoord.y));

vec4 textureValue;
int kernelSizeDiv2 = kernelSize / 2;
int median_arr_size = kernelSize*kernelSize;
vec4[MAX_ARRAY_SIZE] median_arr;

int count = 0;
for (int i = -kernelSizeDiv2; i <= kernelSizeDiv2; i++) {
  for (int j = -kernelSizeDiv2; j <= kernelSizeDiv2; j++) {
    median_arr[count] = texelFetch( image, ivec2(i+int(gl_FragCoord.x), j+int(gl_FragCoord.y)), 0 );
    count++;
  }
}

insertionSort(median_arr, median_arr_size);
if(mod(float(kernelSize), 2.0)!=0.0) {
  textureValue = median_arr[kernelSizeDiv2];
} else {
  textureValue = (median_arr[kernelSizeDiv2] + median_arr[kernelSizeDiv2+1])/2.0;
}

out_FragColor = vec4(vec3(colorScaleR,colorScaleG,colorScaleB),1.0)*textureValue;
}
`
export{knnVertexShader,knnFragmentShader}