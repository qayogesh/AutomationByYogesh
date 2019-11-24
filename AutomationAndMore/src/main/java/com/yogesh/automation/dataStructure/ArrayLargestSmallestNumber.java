package com.yogesh.automation.dataStructure;

public class ArrayLargestSmallestNumber {

	public static void main(String[] args) {
		// TODO Auto-generated method stub
		int[] arr = { 233, 45, 6, 4, 3, 66, 98, 100 };
		System.out.println("max is " + largestNum(arr));
		System.out.println("small is " + samllestNum(arr));
	}

	private static int largestNum(int[] arr) {
		int len = arr.length;
		int max = arr[0];;
		for (int i = 0; i < len; i++) {
			if (arr[i] > max) {
				max = arr[i];
			} else {
				//System.out.println(arr[i] + " is less than " + max);
			}
		}
		return max;
	}

	private static int samllestNum(int[] arr) {
		int len = arr.length;
		int min = arr[0];
		for (int i = 0; i < len; i++) {
			if (arr[i] < min) {
				min = arr[i];
			} else {
				//System.out.println(arr[i] + " is less than " + min);
			}
		}
		return min;
	}

}
