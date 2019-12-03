package com.yogesh.automation.ObjectiveProgramming;

import java.util.Arrays;

public class TC07SecondLargestNumber {

	public static void main(String[] args) {
		TC07SecondLargestNumber obj = new TC07SecondLargestNumber();
		Integer[] arr = {983,3,4,8, 0, 99, 100};
		System.out.println("second largest is " + obj.returnSecondLargest(arr));
	}

	public int returnSecondLargest(Integer[] arr) {
		Arrays.sort(arr);
		return arr[arr.length - 2];
	}

}
