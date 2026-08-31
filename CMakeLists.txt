cmake_minimum_required(VERSION 3.20)
project(QuantumShiftCheckers VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include_directories(cpp/include)

file(GLOB_RECURSE SOURCES "cpp/src/*.cpp")

add_executable(quantum_checkers ${SOURCES})

# Optimize build
if(MSVC)
    target_compile_options(quantum_checkers PRIVATE /O2 /W4)
else()
    target_compile_options(quantum_checkers PRIVATE -O3 -Wall -Wextra)
endif()
