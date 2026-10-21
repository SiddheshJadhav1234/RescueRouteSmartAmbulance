cmake_minimum_required(VERSION 3.16)
project(RescueRouteDSAEngine VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Compiler optimization and warnings
if(MSVC)
    add_compile_options(/W4)
else()
    add_compile_options(-Wall -Wextra -O3)
endif()

include_directories(include)

# DSA Engine Executable
add_executable(rescueroute_engine
    src/main.cpp
    src/Graph.cpp
)

# DSA Unit Test Executable
add_executable(test_dsa
    tests/test_dsa.cpp
    src/Graph.cpp
)

enable_testing()
add_test(NAME DSATests COMMAND test_dsa)
